/* eslint-disable @typescript-eslint/no-misused-promises */
import axios from 'axios'
import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import type { Request } from 'express'
import type { Itinerary, PlanResponse } from './otp'

if (process.env['TAXI_API_KEY'] === undefined) {
  throw new Error('TAXI_API_KEY is undefined. Please set it in .env file.')
}
const taxiApiKey: string = process.env['TAXI_API_KEY']

if (process.env['OTP_ADDRESS'] === undefined) {
  throw new Error('OTP_ADDRESS is undefined. Please set it in .env file.')
}
const otpAddress: string = process.env['OTP_ADDRESS']

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
    lat: coords[0],
    lon: coords[1]
  }
}

const buildTaxiItinary = (otpItinaries: Itinerary[], taxiPricing: GofsPricingApiResponse): Itinerary[] => {
  if (otpItinaries[0] === undefined) {
    return []
  }

  return taxiPricing.options.map((_option) => ({
    ...otpItinaries[0],
    legs: [{
      ...otpItinaries[0]?.legs[0],
      mode: 'CAR'
    }]
  }))
}

app.get('/otp/routers/default/plan', async (req, res) => {
  const fromPlace = getCoordinates(req.query['fromPlace'])
  const toPlace = getCoordinates(req.query['toPlace'])

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
    const taxiItinary = buildTaxiItinary(otpResponse.plan.itineraries, taxiPricing)
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
