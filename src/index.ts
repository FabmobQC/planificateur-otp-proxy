/* eslint-disable @typescript-eslint/no-misused-promises */
import axios from 'axios'
import cors from 'cors'
import dayjs from 'dayjs'
import 'dotenv/config'
import express from 'express'
// @ts-expect-error polyline does not have a declaration file
import polyline from '@mapbox/polyline'

import type { Request } from 'express'
import type { Itinerary, Plan, PlanResponse } from './otp'

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

const getTaxiPricing = async (data: GofsPricingApiRequest): Promise<GofsPricingApiResponse> => {
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

const getCoordinates = (param: any): GofsCoordinates | undefined => {
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

const buildTaxiItinerary = (otpPlan: Plan, taxiPricing: GofsPricingApiResponse): Itinerary[] => {
  const firstItinerary = otpPlan.itineraries[0]
  const from = otpPlan.from
  const to = otpPlan.to

  return taxiPricing.options.map((option) => {
    const startTime = dayjs(option.departureTime).valueOf()
    const endTime = dayjs(option.arrivalTime).valueOf()
    const duration = (endTime - startTime) / 1000

    const legGeometry = {
      points: polyline.encode([[from.lat, from.lon], [to.lat, to.lon]]),
      length: 2
    }

    return {
      duration,
      startTime,
      endTime,
      legs: [{
        agencyTimeZoneOffset: 0,
        arrivalDelay: 0,
        departureDelay: 0,
        distance: 0,
        duration,
        endTime,
        from,
        hailedCar: true,
        interlineWithPreviousLeg: false,
        intermediateStops: [],
        legGeometry,
        mode: 'CAR',
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
          relativeDirection: '',
          stayOn: false,
          streetName: ''
        }],
        to,
        transitLeg: false
      }],
      elevationGained: firstItinerary.elevationGained,
      elevationLost: firstItinerary.elevationLost,
      transfers: 0,
      transitTime: 0,
      waitingTime: 0,
      walkDistance: 0,
      walkLimitExceeded: false,
      walkTime: 0,
      fare: {
        fare: {
          regular: {
            cents: option.pricing.parts[0].amount,
            currency: {
              currency: option.pricing.parts[0].currencyCode,
              defaultFractionDigits: 5,
              currencyCode: option.pricing.parts[0].currencyCode,
              symbol: '$'
            }
          }
        }
      }
    }
  })
}

app.get('/otp/routers/default/plan', async (req, res) => {
  const fromPlace = getCoordinates(req.query.fromPlace)
  const toPlace = getCoordinates(req.query.toPlace)

  if (fromPlace === undefined || toPlace === undefined) {
    res.send('fromPlace or toPlace is undefined')
    res.status(400)
    return
  }

  const taxiData: GofsPricingApiRequest = {
    from: {
      coordinates: fromPlace
    },
    to: {
      coordinates: toPlace
    },
    useAssetTypes: ['taxi-registry-standard-route']
  }

  await Promise.all([
    getTaxiPricing(taxiData),
    getOtpResult(req)
  ]).then((values) => {
    const taxiPricing = values[0]
    const otpResponse = values[1]
    const taxiItinary = buildTaxiItinerary(otpResponse.plan, taxiPricing)
    otpResponse.plan.itineraries.push(...taxiItinary)
    res.send(otpResponse)
  }).catch((error) => {
    res.send(error)
  })
})

app.get('*', async (req, res) => {
  try {
    const otpResponse = await getOtpResult(req)
    res.send(otpResponse)
  } catch (error) {
    res.send(error)
  }
})

app.listen(3000)
