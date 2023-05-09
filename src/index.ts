/* eslint-disable @typescript-eslint/no-misused-promises */
import axios from 'axios'
import 'dotenv/config'
import express from 'express'

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
      'X-API-KEY': process.env['TAXI_API_KEY']
    }
  })
  console.log('response', response.data)
  return response.data
}

app.get('*', async (req, res) => {
  console.log('Request', req.method, req.url, req.protocol, req.hostname)
  try {
    const taxiPrincing = await getTaxiPricing(data)
    res.send(taxiPrincing)
  } catch (error) {
    res.send(error)
  }
})

app.listen(3000)
