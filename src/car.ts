import { DrivingCostsCalculator, isNbKmPerYear } from 'driving-costs-calculator'
import { type GraphQlRequest, getOtpResult } from './otp.js'
import { type FabMobPlanResponse } from '../types/fabmob-otp.js'
import { type AxiosResponse } from 'axios'
import { handleMultipleStops } from './multiple-stops.js'

const calculator = new DrivingCostsCalculator()

export const handleCarRequestWithMultipleStops = async (req: GraphQlRequest): Promise<FabMobPlanResponse | undefined> => {
  return await handleMultipleStops(req, handleCarRequest)
}

export const handleCarRequest = async (req: GraphQlRequest): Promise<FabMobPlanResponse> => {
  const variables = req.body.variables

  const otpResult = await getOtpResult(req) as AxiosResponse<FabMobPlanResponse>
  const planResponse = otpResult.data
  const { vehiculeType, nbKmPerYear, paidParkingTime } = variables
  if (vehiculeType === undefined || !isNbKmPerYear(nbKmPerYear)) {
    return planResponse
  }
  planResponse.data.plan.itineraries.forEach((itinerary) => {
    const distance = itinerary.legs.reduce((acc, leg) => acc + leg.distance, 0)
    const lastLeg = itinerary.legs.at(-1)
    if (lastLeg === undefined) {
      return
    }
    itinerary.drivingCosts = calculator.calculateTripCosts(vehiculeType, nbKmPerYear, distance / 1000, lastLeg.to, paidParkingTime)
  })
  return planResponse
}
