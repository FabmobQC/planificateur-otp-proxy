import axios, { type AxiosResponse } from 'axios'
import type { Request } from 'express'

import type { ReqBody } from '../types/fabmob-otp'
import { otpAddress } from './config.js'

export type GraphQlRequest = Request<unknown, unknown, ReqBody>

export const getOtpResult = async (req: GraphQlRequest): Promise<AxiosResponse> => {
  return await axios({
    method: req.method,
    url: `${otpAddress}${req.url}`,
    data: req.body,
    headers: req.headers,
    params: req.query
  })
}
