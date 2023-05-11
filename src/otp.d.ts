import type { Itinary, Place } from '@opentripplanner/types'

export * from '@opentripplanner/types'

export interface Plan {
  date: number
  from: Place
  to: Place
  itineraries: Itinary[]
}

export interface PlanResponse {
  requestParameters: Record<string, any>
  plan: Plan
  error: Record<string, any>
  debugOutput: Record<string, any>
  elevationMetadata: Record<string, any>
}
