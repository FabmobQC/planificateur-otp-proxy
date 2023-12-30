import type { Itinerary, TransportMode, InputBanned } from '@opentripplanner/types'
import { VehiculeType } from 'driving-costs-calculator'

export * from '@opentripplanner/types'

export interface OtpError {
  code: string
  description: string
  inputField: unknown
}

export interface Plan {
  itineraries: Itinerary[]
  routingErrors: OtpError[]
}

export interface PlanResponse {
  data: {
    plan: Plan
  }
}

export interface Variables {
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
  variables: Variables
}
