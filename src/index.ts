/* eslint-disable @typescript-eslint/no-misused-promises */
import axios from 'axios'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import cors from 'cors'
import express, { type Response } from 'express'

import { getOtpGetResult, getOtpResult, type GraphQlRequest } from './otp.js'
import { handleTaxiRequestWithMultipleStops } from './taxi.js'
import { handleCarRequestWithMultipleStops } from './car.js'
import { handleTransitRequestWithMultipleStops } from './transit.js'
import { handleTouristicPlacesRequest } from './touristic-places.js'
import { handleMultipleStops } from './multiple-stops.js'
import { handleCommunautoStationsRequest } from './communauto.js'
import { handleAmenitiesRequest } from './amenities.js'
import { handleAdministrativeRegionsRequest } from './administrative-regions.js'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('America/Montreal')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/amenities', async (req: unknown, res: Response): Promise<void> => {
  const amenities = await handleAmenitiesRequest(req)
  res.send(JSON.stringify({ amenities }))
})

app.get('/communauto-stations', async (req: unknown, res: Response): Promise<void> => {
  const communautoStations = await handleCommunautoStationsRequest(req)
  res.send(JSON.stringify({ communautoStations }))
})

app.get('/touristic-places', async (req: unknown, res: Response): Promise<void> => {
  const touristicPlaces = await handleTouristicPlacesRequest(req)
  res.send(JSON.stringify({ touristicPlaces }))
})

app.get('/administrative-regions', async (req: unknown, res: Response): Promise<void> => {
  const regions = await handleAdministrativeRegionsRequest(req)
  res.send(regions)
})

app.get('*', async (req, res): Promise<void> => {
  try {
    const response = await getOtpGetResult(req)
    res.send(response.data)
  } catch (error) {
    res.status(500)
  }
})

app.all('*', async (req: GraphQlRequest, res: Response): Promise<void> => {
  const variables = req.body.variables
  try {
    if (variables.modes?.some(({ mode }) => mode === 'TAXI') === true) {
      const result = await handleTaxiRequestWithMultipleStops(req)
      if (result === undefined) {
        res.status(400)
        return
      }
      res.send(result)
    } else if (variables.modes?.some(({ mode }) => mode === 'CAR') === true) {
      const result = await handleCarRequestWithMultipleStops(req)
      res.send(result)
    } else if (variables.modes?.some(({ mode }) => mode === 'BICYCLE') === true) {
      const result = await handleMultipleStops(req, async (req) => (await getOtpResult(req)).data)
      if (result === undefined) {
        res.status(400)
        return
      }
      res.send(result)
    } else if (variables.modes?.some(({ mode }) => mode === 'BUS' || mode === 'SUBWAY') === true) {
      const result = await handleTransitRequestWithMultipleStops(req)
      res.send(result)
    } else {
      const result = await getOtpResult(req)
      res.status(result.status)
      res.send(result.data)
    }
  } catch (error) {
    console.error(error)
    if (axios.isAxiosError(error)) {
      const response = error.response
      res.status(response?.status ?? 500).send(response?.data)
    } else {
      res.status(500)
    }
  }
})

app.listen(3000)
