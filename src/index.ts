/* eslint-disable @typescript-eslint/no-misused-promises */
import axios from 'axios'
import cors from 'cors'
import express, { type Response } from 'express'

import { getOtpResult, type GraphQlRequest } from './otp.js'
import { handleTaxiRequest } from './taxi.js'
import { handleCarRequest } from './car.js'
import { handleTransitRequest } from './transit.js'
import { handleTouristicPlacesRequest } from './touristic-places.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/touristic-places', async (req: unknown, res: Response): Promise<void> => {
  const touristicPlaces = await handleTouristicPlacesRequest(req)
  res.send(JSON.stringify({ touristicPlaces }))
})

app.all('*', async (req: GraphQlRequest, res: Response): Promise<void> => {
  const variables = req.body.variables
  try {
    if (variables.modes?.some(({ mode }) => mode === 'TAXI') === true) {
      const result = await handleTaxiRequest(req)
      if (result === undefined) {
        res.status(400)
        return
      }
      res.send(result)
    } else if (variables.modes?.some(({ mode }) => mode === 'CAR') === true) {
      const result = await handleCarRequest(req)
      res.send(result)
    } else if (variables.modes?.some(({ mode }) => mode === 'BUS' || mode === 'SUBWAY') === true) {
      const result = await handleTransitRequest(req)
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
