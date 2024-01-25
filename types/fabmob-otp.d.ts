import type { Itinerary, TransportMode, InputBanned } from '@opentripplanner/types'
import { type VehiculeType } from 'driving-costs-calculator'

export * from '@opentripplanner/types'

export interface FabMobOtpError {
  code: string
  description: string
  inputField: unknown
}

export interface FabMobItinerary extends Itinerary {
  taxiPricing?: TaxiPricingApiResponseOption
  drivingCosts?: number
  transitFare?: number
}

export interface FabMobPlan {
  itineraries: FabMobItinerary[]
  routingErrors: FabMobOtpError[]
}

export interface FabMobPlanResponse {
  data: {
    plan: FabMobPlan
  }
}

export interface FabMobVariables {
  arriveBy: boolean
  banned?: InputBanned
  bikeReluctance?: number
  carReluctance?: number
  date: string
  fromPlace: string
  modes: TransportMode[]
  numItineraries?: number
  preferred?: InputPreferred
  time?: string
  toPlace: string
  walkReluctance?: number
  walkSpeed?: number
  wheelchair?: boolean

  vehiculeType: VehiculeType
  nbKmPerYear: number
}

export interface ReqBody {
  query: string
  variables: FabMobVariables
}
