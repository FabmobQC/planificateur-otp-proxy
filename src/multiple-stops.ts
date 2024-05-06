import dayjs from 'dayjs'
import { type FabMobPlanResponse, type FabMobItinerary, type Leg, type FabMobOtpError, type Place } from '../types/fabmob-otp'
import { type GraphQlRequest } from './otp'

function additionFields <T extends boolean | undefined> (a: T, b: T): T
function additionFields <T extends number | undefined> (a: T, b: T): T
function additionFields (a: boolean | number | undefined, b: boolean | number | undefined): boolean | number | undefined {
  if (a === undefined) {
    return b
  }
  if (b === undefined) {
    return a
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a && b
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a + b
  }
}

const concatTaxiPricing = (a?: TaxiPricingApiResponseOption, b?: TaxiPricingApiResponseOption): TaxiPricingApiResponseOption | undefined => {
  if (a === undefined) {
    return b
  }
  if (b === undefined) {
    return a
  }
  return {
    ...a,
    estimatedWaitTime: additionFields(a.estimatedWaitTime, b.estimatedWaitTime),
    estimatedTravelTime: additionFields(a.estimatedTravelTime, b.estimatedTravelTime),
    arrivalTime: b.arrivalTime,
    to: b.to,
    pricing: {
      ...a.pricing,
      estimated: a.pricing.estimated && b.pricing.estimated,
      parts: [
        {
          ...a.pricing.parts[0],
          amount: a.pricing.parts[0].amount + b.pricing.parts[0].amount
        }
      ]
    }
  }
}

const buildStopoverLeg = (legsBefore: Leg[], legsAfter: Leg[]): Leg => {
  const legBefore = legsBefore.at(legsBefore.length - 1) as Leg
  const legAfter = legsAfter[0]
  return {
    arrivalDelay: 0,
    agencyTimeZoneOffset: 0,
    departureDelay: 0,
    distance: 0,
    duration: (legAfter.endTime - (legBefore.startTime as number)) / 1000,
    endTime: legAfter.startTime as number,
    from: legAfter.from,
    interlineWithPreviousLeg: false,
    intermediateStops: [],
    legGeometry: { length: 0, points: '' },
    mode: 'STOPOVER',
    pathway: false,
    realTime: false,
    rentedBike: false,
    rentedCar: false,
    rentedVehicle: false,
    startTime: legBefore.endTime,
    steps: [],
    to: legAfter.from,
    transitLeg: false
  }
}

// A response might have several itineraries.
// An ItinerarySelector is used to select the itineraries that will be merged together when there are multiple stops.
// For example, we could merge together all the shortest itineraries in time, then the shortest in distances, then the cheapests, etc.
type ItinerarySelector = (itineraries: FabMobItinerary[]) => FabMobItinerary

export const fusionItineraries = (
  itineraries: FabMobItinerary[]
): FabMobItinerary => {
  const initialItinerary = itineraries[0]
  return itineraries.slice(1).reduce<FabMobItinerary>((acc, otherItinerary) => {
    return {
      ...acc,
      co2: additionFields(acc.co2, otherItinerary.co2),
      co2VsBaseline: additionFields(acc.co2VsBaseline, otherItinerary.co2VsBaseline),
      duration: (otherItinerary.endTime - acc.startTime) / 1000,
      elevationGained: additionFields(acc.elevationGained, otherItinerary.elevationGained),
      elevationLost: additionFields(acc.elevationLost, otherItinerary.elevationLost),
      endTime: otherItinerary.endTime,
      legs: [
        ...acc.legs,
        buildStopoverLeg(acc.legs, otherItinerary.legs),
        ...otherItinerary.legs
      ],
      startTime: acc.startTime,
      tooSloped: additionFields(acc.tooSloped, otherItinerary.tooSloped),
      transfers: additionFields(acc.transfers, otherItinerary.transfers),
      transitTime: additionFields(acc.transitTime, otherItinerary.transitTime),
      waitingTime: additionFields(acc.waitingTime, otherItinerary.waitingTime),
      walkDistance: additionFields(acc.walkDistance, otherItinerary.walkDistance),
      walkLimitExceeded: additionFields(acc.walkLimitExceeded, otherItinerary.walkLimitExceeded),
      walkTime: additionFields(acc.walkTime, otherItinerary.walkTime),
      taxiPricing: concatTaxiPricing(acc.taxiPricing, otherItinerary.taxiPricing),
      drivingCosts: additionFields(acc.drivingCosts, otherItinerary.drivingCosts),
      transitFare: additionFields(acc.transitFare, otherItinerary.transitFare)
    } satisfies FabMobItinerary
  }, initialItinerary)
}

const getDeparture = (
  previousItinerary: FabMobItinerary,
  delayInHours: number = 0
): { date: string, time: string } => {
  const delayInMicroseconds = delayInHours * 60 * 60 * 1000
  const dayjsTime = dayjs(previousItinerary.endTime + delayInMicroseconds)
  const date = dayjsTime.tz().format('YYYY-MM-DD')
  const time = dayjsTime.tz().format('HH:mm')
  return { date, time }
}

type ModeHandler = (req: GraphQlRequest) => Promise<FabMobPlanResponse | undefined>

const defaultItinerarySelectors: ItinerarySelector[] = [
  itineraries => itineraries[0]
]

type ItineriesWithSelectors = Array<[itinerary: FabMobItinerary, selector: ItinerarySelector]>

const mapItinerariesWithSelectors = (
  baseItineraries: FabMobItinerary[],
  itinerarySelectors: ItinerarySelector[]
): ItineriesWithSelectors => {
  const nbItineraries = Math.min(baseItineraries.length, itinerarySelectors.length)
  const result: ItineriesWithSelectors = []
  itinerarySelectors.slice(0, nbItineraries).forEach((itinerarySelector) => {
    const itinerary = itinerarySelector(baseItineraries)
    const itineraries = result.map(([itinerary]) => itinerary)
    if (!itineraries.includes(itinerary)) {
      result.push([itinerary, itinerarySelector])
    }
  })
  return result
}

const encodePlace = (place: Place): string => {
  return `${place.name}::${place.lat},${place.lon}`
}

export const handleMultipleStops = async (
  req: GraphQlRequest,
  modeHandler: ModeHandler,
  itinerarySelectors: ItinerarySelector[] = defaultItinerarySelectors
): Promise<FabMobPlanResponse | undefined> => {
  const variables = req.body.variables
  const additionalPlaces = variables.additionalPlaces ?? []
  const additionalPlacesWaitingTimes = variables.additionalPlacesWaitingTimes ?? []
  if (additionalPlaces.length !== additionalPlacesWaitingTimes.length) {
    console.warn('additionalPlaces and additionalPlacesWaitingTimes lengths do not match:', variables)
    return
  }

  const baseResponse = await modeHandler(req)

  if (baseResponse?.data?.plan.itineraries === undefined) {
    console.warn('No itineraries in base response:', baseResponse)
    return
  }

  const itinerariesWithSelectors = mapItinerariesWithSelectors(baseResponse.data.plan.itineraries, itinerarySelectors)

  const itineraries: FabMobItinerary[] = []
  const routingErrors: FabMobOtpError[] = []

  await Promise.all(itinerariesWithSelectors.map(async ([baseItinerary, itinerarySelector]) => {
    const itinerariesToMerge = [baseItinerary]

    for (const [index, place] of additionalPlaces.entries()) {
      const additionalPlacesWaitingTime = additionalPlacesWaitingTimes[index]
      const previousItinerary = itinerariesToMerge[itinerariesToMerge.length - 1]

      const newReq = {
        ...req,
        body: {
          ...req.body,
          variables: {
            ...req.body.variables,
            ...getDeparture(previousItinerary, additionalPlacesWaitingTime),
            fromPlace: encodePlace(previousItinerary.legs[previousItinerary.legs.length - 1].to),
            toPlace: place
          }
        }
      }

      const response = await modeHandler(
        // request does not have proper Request methods, as it seems Express does not have ways to create a Request object.
        // Will crash if there is an attempt to use the methods.
        newReq as GraphQlRequest
      )
      const newItineraries = response?.data?.plan.itineraries
      if (newItineraries !== undefined) {
        itinerariesToMerge.push(itinerarySelector(newItineraries))
      }
      const newRoutingErrors = response?.data?.plan.routingErrors
      if (newRoutingErrors !== undefined) {
        routingErrors.push(...newRoutingErrors)
      }
    }

    if (itinerariesToMerge.length === additionalPlaces.length + 1) {
      const mergedItineraries = fusionItineraries(itinerariesToMerge)
      itineraries.push(mergedItineraries)
    }
  }))
  return {
    ...baseResponse,
    data: {
      plan: {
        itineraries,
        routingErrors
      }
    }
  }
}
