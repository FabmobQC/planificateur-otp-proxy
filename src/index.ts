/* eslint-disable @typescript-eslint/no-misused-promises */
import axios from 'axios'
import 'dotenv/config'
import express from 'express'
import type { Request } from 'express'

if (process.env['TAXI_API_KEY'] === undefined) {
  throw new Error('TAXI_API_KEY is undefined. Please set it in .env file.')
}
const taxiApiKey: string = process.env['TAXI_API_KEY']

if (process.env['OTP_ADDRESS'] === undefined) {
  throw new Error('OTP_ADDRESS is undefined. Please set it in .env file.')
}
const otpAddress: string = process.env['OTP_ADDRESS']

interface Coordinates {
  lat: string
  lon: string
}

interface TaxiApiRequestData {
  from: {
    coordinates: Coordinates
  }
  to: {
    coordinates: Coordinates
  }
  useAssetTypes: ['taxi-registry-standard-route'] | ['taxi-registry-minivan-route'] | ['axi-registry-special-need-route']
}

const data: TaxiApiRequestData = {
  from: {
    coordinates: {
      lat: '45.52113922722745',
      lon: '-73.57644290418484'
    }
  },
  to: {
    coordinates: {
      lat: '45.508902',
      lon: '-73.554398'
    }
  },
  useAssetTypes: ['taxi-registry-standard-route']
}

const app = express()

const getTaxiPricing = async (data: TaxiApiRequestData): Promise<TaxiApiRequestData> => {
  const response = await axios.post('https://taximtl.ville.montreal.qc.ca/api/inquiry', data, {
    headers: {
      'X-API-KEY': taxiApiKey
    }
  })
  return response.data
}

const getOtpResponse = async (req: Request): Promise<any> => {
  const response = await axios.get(`${otpAddress}${req.url}`)
  return response.data
}

app.get('*', async (req, res) => {
  console.log('Request', req.method, req.url, req.protocol, req.hostname)
  try {
    const taxiPricing = await getTaxiPricing(data)
    const otpResponse = await getOtpResponse(req)
    console.log('taxiPricing', taxiPricing)
    res.send(otpResponse)
  } catch (error) {
    res.send(error)
  }
})

app.listen(3000)
