import { DrivingCostsCalculator } from 'driving-costs-calculator'
import { type GraphQlRequest, getOtpResult } from './otp.js'
import { type FabMobPlanResponse } from '../types/fabmob-otp.js'
import { type AxiosResponse } from 'axios'

const calculator = new DrivingCostsCalculator()

export const handleCarRequest = async (req: GraphQlRequest): Promise<FabMobPlanResponse> => {
  const variables = req.body.variables

  const otpResult = await getOtpResult(req) as AxiosResponse<FabMobPlanResponse>
  const planResponse = otpResult.data
  const { vehiculeType, nbKmPerYear } = variables
  if (vehiculeType === undefined || nbKmPerYear === undefined) {
    return planResponse
  }
  planResponse.data.plan.itineraries.forEach((itinerary) => {
    const distance = itinerary.legs.reduce((acc, leg) => acc + leg.distance, 0)
    itinerary.drivingCosts = calculator.calculateTripCosts(vehiculeType, nbKmPerYear, distance / 1000)
  })
  return planResponse
}
