import { DrivingCostsCalculator } from 'driving-costs-calculator'
import { type GraphQlRequest, getOtpResult } from './otp.js'
import { type PlanResponse } from '../types/otp'
import { type AxiosResponse } from 'axios'

const calculator = new DrivingCostsCalculator()

export const handleCarRequest = async (req: GraphQlRequest): Promise<PlanResponse> => {
  const variables = req.body.variables

  const otpResult = await getOtpResult(req) as AxiosResponse<PlanResponse>
  const planResponse = otpResult.data
  const { vehiculeType, nbKmPerYear } = variables
  if (vehiculeType === undefined || nbKmPerYear === undefined) {
    return planResponse
  }
  planResponse.data.plan.itineraries.forEach((itinerary) => {
    itinerary.legs.forEach((leg) => {
      const cost = calculator.calculateTripCosts(vehiculeType, nbKmPerYear, leg.distance / 1000)
      const price = {
        currency: {
          code: 'CAD'
        },
        amount: cost
      }
      leg.rideHailingEstimate = {
        provider: {
          id: '' // falsy value to have isRideshareLeg in otp-ui return 'false'
        },
        arrival: 'PT0H0M', // Won't be displayed
        minPrice: price,
        maxPrice: price
      }
    })
  })
  return planResponse
}
