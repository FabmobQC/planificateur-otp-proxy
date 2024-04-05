import dayjs from 'dayjs'
import { type FabMobVariables, type FabMobPlanResponse, type FabMobItinerary } from '../types/fabmob-otp'
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

// A response might have several itineraries.
// An ItinerarySelector is used to select the itineraries that will be merged together when there are multiple stops.
// For example, we could merge together all the shortest itineraries in time, then the shortest in distances, then the cheapests, etc.
type ItinerarySelector = (itineraries: FabMobItinerary[]) => FabMobItinerary

export const fusionResponses = (
  responses: FabMobPlanResponse[],
  itinerarySelectors: ItinerarySelector[]
): FabMobPlanResponse => {
  const responsesItineraries = responses.map(response => response.data.plan.itineraries)
  const routingErrors = responses.map(response => response.data.plan.routingErrors).flat()

  const nbItineraries = Math.min(...responsesItineraries.map(itineraries => itineraries.length), itinerarySelectors.length)

  const itineraries = itinerarySelectors.slice(0, nbItineraries).reduce<FabMobItinerary[]>((acc, selector) => {
    acc.push(fusionItineraries(responsesItineraries, selector))
    return acc
  }, [])

  return {
    ...responses[0],
    data: {
      plan: {
        ...responses[0].data.plan,
        itineraries,
        routingErrors
      }
    }
  }
}

export const fusionItineraries = (
  responsesItineraries: FabMobItinerary[][],
  selectItinerary: ItinerarySelector
): FabMobItinerary => {
  const initialItinerary = selectItinerary(responsesItineraries[0])
  return responsesItineraries.slice(1).reduce<FabMobItinerary>((acc, responseItineraries) => {
    const otherItinerary = selectItinerary(responseItineraries)
    return {
      ...acc,
      co2: additionFields(acc.co2, otherItinerary.co2),
      co2VsBaseline: additionFields(acc.co2VsBaseline, otherItinerary.co2VsBaseline),
      duration: (otherItinerary.endTime - acc.startTime) / 1000,
      elevationGained: additionFields(acc.elevationGained, otherItinerary.elevationGained),
      elevationLost: additionFields(acc.elevationLost, otherItinerary.elevationLost),
      endTime: additionFields(acc.endTime, otherItinerary.endTime),
      legs: [
        ...acc.legs,
        ...otherItinerary.legs
      ],
      startTime: additionFields(acc.startTime, otherItinerary.startTime),
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
  currentVars: FabMobVariables,
  previousItinerary: FabMobItinerary | undefined,
  delayInHours: number = 0
): { date: string, time: string } => {
  if (previousItinerary === undefined) {
    return { date: currentVars.date ?? '', time: currentVars.time ?? '' }
  }
  const delayInMicroseconds = delayInHours * 60 * 60 * 1000
  const dayjsTime = dayjs(previousItinerary.endTime + delayInMicroseconds)
  const date = dayjsTime.format('YYYY-MM-DD')
  const time = dayjsTime.format('HH:mm')
  return { date, time }
}

type ModeHandler = (req: GraphQlRequest) => Promise<FabMobPlanResponse | undefined>

const defaultItinerarySelectors: ItinerarySelector[] = [
  itineraries => itineraries[0],
  itineraries => itineraries[1],
  itineraries => itineraries[2]
]

export const handleMultipleStops = async (
  req: GraphQlRequest,
  modeHandler: ModeHandler,
  itinerarySelectors: ItinerarySelector[] = defaultItinerarySelectors
): Promise<FabMobPlanResponse | undefined> => {
  const places = [
    req.body.variables.fromPlace,
    req.body.variables.toPlace,
    ...(req.body.variables.additionalPlaces ?? [])
  ]

  const delays = [
    0,
    ...(req.body.variables.additionalPlacesWaitingTimes ?? [])
  ]

  const responses: FabMobPlanResponse[] = []
  for (let i = 0; i < places.length - 1; i++) {
    const delay = delays[i]
    const previousItinerary = responses[responses.length - 1]?.data.plan.itineraries[0]
    const newReq = {
      ...req,
      body: {
        ...req.body,
        variables: {
          ...req.body.variables,
          ...getDeparture(req.body.variables, previousItinerary, delay),
          fromPlace: places[i],
          toPlace: places[i + 1]
        }
      }
    }
    const response = await modeHandler(
      // request does not have proper Request methods, as it seems Express does not have ways to create a Request object.
      // Will crash if there is an attempt to use the methods.
      newReq as GraphQlRequest
    )
    if (response === undefined) {
      // We can't build a full response
      return undefined
    }
    responses.push(response)
  }
  return fusionResponses(responses, itinerarySelectors)
}
