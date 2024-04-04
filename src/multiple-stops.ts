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

const concatTaxiPrincing = (a?: TaxiPricingApiResponseOption, b?: TaxiPricingApiResponseOption): TaxiPricingApiResponseOption | undefined => {
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

export const fusionResponses = (responses: FabMobPlanResponse[]): FabMobPlanResponse => {
  return responses.slice(1).reduce<FabMobPlanResponse>((acc, response) => {
    const accRoutingErrors = acc.data.plan.routingErrors
    const otherRoutingErrors = response.data.plan.routingErrors
    const accItinerary = acc.data.plan.itineraries[0]
    const otherItinerary = response.data.plan.itineraries[0]
    return {
      ...acc,
      data: {
        plan: {
          ...acc.data.plan,
          itineraries: [
            {
              ...accItinerary,
              co2: additionFields(accItinerary.co2, otherItinerary.co2),
              co2VsBaseline: additionFields(accItinerary.co2VsBaseline, otherItinerary.co2VsBaseline),
              duration: (otherItinerary.endTime - accItinerary.startTime) / 1000,
              elevationGained: additionFields(accItinerary.elevationGained, otherItinerary.elevationGained),
              elevationLost: additionFields(accItinerary.elevationLost, otherItinerary.elevationLost),
              endTime: additionFields(accItinerary.endTime, otherItinerary.endTime),
              legs: [
                ...accItinerary.legs,
                ...otherItinerary.legs
              ],
              startTime: additionFields(accItinerary.startTime, otherItinerary.startTime),
              tooSloped: additionFields(accItinerary.tooSloped, otherItinerary.tooSloped),
              transfers: additionFields(accItinerary.transfers, otherItinerary.transfers),
              transitTime: additionFields(accItinerary.transitTime, otherItinerary.transitTime),
              waitingTime: additionFields(accItinerary.waitingTime, otherItinerary.waitingTime),
              walkDistance: additionFields(accItinerary.walkDistance, otherItinerary.walkDistance),
              walkLimitExceeded: additionFields(accItinerary.walkLimitExceeded, otherItinerary.walkLimitExceeded),
              walkTime: additionFields(accItinerary.walkTime, otherItinerary.walkTime),
              taxiPricing: concatTaxiPrincing(accItinerary.taxiPricing, otherItinerary.taxiPricing),
              drivingCosts: additionFields(accItinerary.drivingCosts, otherItinerary.drivingCosts),
              transitFare: additionFields(accItinerary.transitFare, otherItinerary.transitFare)
            }
          ],
          routingErrors: [
            ...accRoutingErrors,
            ...otherRoutingErrors
          ]
        }
      }
    } satisfies FabMobPlanResponse
  }, responses[0])
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

export const handleMultipleStops = async (req: GraphQlRequest, modeHandler: ModeHandler): Promise<FabMobPlanResponse | undefined> => {
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
  return fusionResponses(responses)
}
