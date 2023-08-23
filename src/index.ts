/* eslint-disable @typescript-eslint/no-misused-promises */
import axios from 'axios'
import cors from 'cors'
import dayjs from 'dayjs'
import 'dotenv/config'
import express from 'express'
// @ts-expect-error polyline does not have a declaration file
import polyline from '@mapbox/polyline'

import type { Request, Response } from 'express'
import type { Itinerary, Plan, PlanResponse } from '../types/otp'
import { isTaxiAssetTypeList } from '../types/taxi-type-predicates.js'

if (process.env.TAXI_API_KEY === undefined) {
  throw new Error('TAXI_API_KEY is undefined. Please set it in .env file.')
}
const taxiApiKey: string = process.env.TAXI_API_KEY

if (process.env.OTP_ADDRESS === undefined) {
  throw new Error('OTP_ADDRESS is undefined. Please set it in .env file.')
}
const otpAddress: string = process.env.OTP_ADDRESS

const app = express()
app.use(cors())

const getTaxiPricing = async (data: TaxiPricingApiRequest): Promise<TaxiPricingApiResponse> => {
  const response = await axios.post('https://taximtl.ville.montreal.qc.ca/api/inquiry', data, {
    headers: {
      'X-API-KEY': taxiApiKey
    }
  })
  return response.data
}

const getOtpResult = async (req: Request): Promise<PlanResponse> => {
  const response = await axios.get(`${otpAddress}${req.url}`, { headers: req.headers })
  return response.data
}

const getTaxiAssetTypes = (value: unknown): TaxiAssetType[] => {
  const defaultValue: TaxiAssetType[] = ['taxi-registry-standard']
  if (typeof value !== 'string') {
    return defaultValue
  }
  const types = value?.split(',')
  if (isTaxiAssetTypeList(types)) {
    return types
  }
  return defaultValue
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

  const from = otpPlan.from
  const to = otpPlan.to

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

// Forward request to OTP as is
const defaultController = async (req: Request, res: Response): Promise<void> => {
  try {
    const otpResponse = await getOtpResult(req)
    res.send(otpResponse)
  } catch (error) {
    res.send(error)
  }
}

app.get('/otp/routers/default/plan', async (req, res) => {
  if (req.query.mode !== 'TAXI') {
    await defaultController(req, res)
    return
  }

  req.url = req.url.replace('mode=TAXI', 'mode=CAR')

  const fromPlace = getCoordinates(req.query.fromPlace)
  const toPlace = getCoordinates(req.query.toPlace)
  const assetTypes = getTaxiAssetTypes(req.query.taxiAssetType)

  if (fromPlace === undefined || toPlace === undefined) {
    res.send('fromPlace or toPlace is undefined')
    res.status(400)
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

  await Promise.all([
    getTaxiPricing(taxiData),
    getOtpResult(req)
  ]).then((values) => {
    const taxiPricing = values[0]
    const otpResponse = values[1]
    const taxiItinaries = buildTaxiItineraries(otpResponse.plan, taxiPricing)
    otpResponse.plan.itineraries = taxiItinaries
    res.send(otpResponse)
  }).catch((error) => {
    res.send(error)
  })
})

app.get('*', defaultController)

app.listen(3000)
