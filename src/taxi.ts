import axios, { type AxiosResponse } from 'axios'
import dayjs from 'dayjs'
// @ts-expect-error polyline does not have a declaration file
import polyline from '@mapbox/polyline'

import { type PlanResponse, type Itinerary, type Plan, type Variables } from '../types/otp'
import { taxiApiKey } from './config.js'
import { getOtpResult, type GraphQlRequest } from './otp.js'

const getTaxiPricing = async (data: TaxiPricingApiRequest): Promise<TaxiPricingApiResponse> => {
  const response = await axios.post('https://taximtl.ville.montreal.qc.ca/api/inquiry', data, {
    headers: {
      'X-API-KEY': taxiApiKey
    }
  })
  return response.data
}

const getTaxiAssetTypes = (variables: Variables): TaxiAssetType[] => {
  const assetTypes: TaxiAssetType[] = []
  Object.entries(variables).forEach(([key, value]) => {
    if (key === 'taxiStandard' && value === true) {
      assetTypes.push('taxi-registry-standard')
    } else if (key === 'taxiMinivan' && value === true) {
      assetTypes.push('taxi-registry-minivan')
    } else if (key === 'taxiSpecial' && value === true) {
      assetTypes.push('taxi-registry-special-need')
    }
  })
  return assetTypes
}

const getCoordinates = (param: unknown): GofsCoordinates | undefined => {
  if (typeof param !== 'string') {
    return undefined
  }
  // param is in the form of 'Savoir-faire Linux, Rue Saint-Urbain, Villeray–Saint-Michel–Parc-Extension, Quebec, H2R 2Y5, Montreal, Canada::45.53427475,-73.62050405015297'
  const coords = param?.split('::')?.[1]?.split(',')
  if (coords === undefined || coords[0] === undefined || coords[1] === undefined) {
    return undefined
  }
  return {
    lat: parseFloat(coords[0]),
    lon: parseFloat(coords[1])
  }
}

const buildTaxiItineraries = (otpPlan: Plan, taxiPricing: TaxiPricingApiResponse): Itinerary[] => {
  const carItinerary = otpPlan.itineraries.find((itinerary) => itinerary.legs.find((leg) => leg.mode === 'CAR'))
  const baseItinerary = carItinerary ?? otpPlan.itineraries[0]

  const from = otpPlan.itineraries[0].legs[0].from
  const lastItinerary = otpPlan.itineraries[otpPlan.itineraries.length - 1]
  const lastLeg = lastItinerary.legs[lastItinerary.legs.length - 1]
  const to = lastLeg.to

  const carLeg = carItinerary?.legs.find((leg) => leg.mode === 'CAR')
  const legGeometry = carLeg?.legGeometry ?? {
    points: polyline.encode([[from.lat, from.lon], [to.lat, to.lon]]),
    length: 2
  }

  return taxiPricing.options.map((option) => {
    const startTime = dayjs(option.departureTime).valueOf()
    const endTime = dayjs(option.arrivalTime).valueOf()

    return {
      duration: option.estimatedTravelTime ?? 0,
      startTime,
      endTime,
      legs: [{
        agencyId: option.booking.agency.id,
        agencyName: option.booking.agency.name,
        agencyUrl: option.booking.webUrl ?? undefined,
        pickupBookingInfo: {
          contactInfo: {
            phoneNumber: option.booking.phoneNumber ?? ''
          }
        },
        agencyTimeZoneOffset: 0,
        arrivalDelay: 0,
        departureDelay: 0,
        distance: 0,
        duration: option.estimatedTravelTime ?? 0,
        endTime,
        from,
        hailedCar: true,
        interlineWithPreviousLeg: false,
        intermediateStops: [],
        legGeometry,
        mode: 'TAXI',
        pathway: false,
        realTime: false,
        rentedBike: false,
        rentedCar: false,
        rentedVehicle: false,
        startTime,
        steps: [{
          area: true,
          bogusName: false,
          distance: 0,
          elevation: [],
          lat: to.lat,
          lon: to.lon,
          relativeDirection: 'CONTINUE',
          stayOn: false,
          streetName: ''
        }],
        tncData: {
          company: option.booking.agency.name,
          currency: option.pricing.parts[0].currencyCode,
          displayName: option.booking.agency.name,
          estimatedArrival: endTime,
          maxCost: option.pricing.parts[0].amount,
          minCost: option.pricing.parts[0].amount,
          productId: option.mainAssetType.id,
          travelDuration: option.estimatedTravelTime ?? 0
        },
        to,
        transitLeg: false
      }],
      elevationGained: baseItinerary.elevationGained,
      elevationLost: baseItinerary.elevationLost,
      transfers: 0,
      transitTime: 0,
      waitingTime: option.estimatedWaitTime,
      walkDistance: 0,
      walkLimitExceeded: false,
      walkTime: 0,
      fare: {
        fare: {
          regular: {
            cents: option.pricing.parts[0].amount * 100, // OTP expects cents
            currency: {
              currency: option.pricing.parts[0].currencyCode,
              defaultFractionDigits: 2,
              currencyCode: option.pricing.parts[0].currencyCode,
              symbol: '$'
            }
          }
        }
      }
    }
  })
}

export const handleTaxiRequest = async (req: GraphQlRequest): Promise<PlanResponse | undefined> => {
  const variables = req.body.variables
  variables.modes.forEach((transportMode) => {
    if (transportMode.mode === 'TAXI') {
      transportMode.mode = 'CAR'
    }
  })
  const fromPlace = getCoordinates(variables.fromPlace)
  const toPlace = getCoordinates(variables.toPlace)
  const assetTypes = getTaxiAssetTypes(variables)
  if (fromPlace === undefined || toPlace === undefined) {
    return
  }
  const taxiData: TaxiPricingApiRequest = {
    from: {
      coordinates: fromPlace
    },
    to: {
      coordinates: toPlace
    },
    useAssetTypes: assetTypes
  }

  return await Promise.all([
    getTaxiPricing(taxiData),
    getOtpResult(req)
  ]).then((values) => {
    const taxiPricing = values[0]
    const otpResponse = values[1] as AxiosResponse<PlanResponse>
    const planResponse = otpResponse.data
    const taxiItinaries = buildTaxiItineraries(planResponse.data.plan, taxiPricing)
    planResponse.data.plan.itineraries = taxiItinaries
    return planResponse
  })
}
