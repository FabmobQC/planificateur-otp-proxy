/* eslint-disable @typescript-eslint/no-misused-promises */
import axios from 'axios'
import cors from 'cors'
import express, { type Response } from 'express'

import { getOtpResult, type GraphQlRequest } from './otp.js'
import { handleTaxiRequest } from './taxi.js'
import { handleCarRequest } from './car.js'
import { handleTransitRequest } from './transit.js'

const app = express()
app.use(cors())
app.use(express.json())

app.all('*', async (req: GraphQlRequest, res: Response): Promise<void> => {
  const variables = req.body.variables
  try {
    if (variables.modes.some(({ mode }) => mode === 'TAXI')) {
      const result = await handleTaxiRequest(req)
      if (result === undefined) {
        res.status(400)
        return
      }
      res.send(result)
    } else if (variables.modes.some(({ mode }) => mode === 'CAR')) {
      const result = await handleCarRequest(req)
      res.send(result)
    } else if (variables.modes.some(({ mode }) => mode === 'BUS' || mode === 'SUBWAY')) {
      const result = await handleTransitRequest(req)
      res.send(result)
    } else {
      const result = await getOtpResult(req)
      res.status(result.status)
      res.send(result.data)
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status ?? 500)
    } else {
      res.status(500)
    }
  }
})

app.listen(3000)
