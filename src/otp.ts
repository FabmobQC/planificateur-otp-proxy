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
    headers: {
      ...req.headers,
      'content-length': undefined // This property would make the request fail if it has been modified.
    },
    params: req.query
  })
}

// For unknown reason, get requests are not forwarded properly by getOtpResult
export const getOtpGetResult = async (req: Request): Promise<AxiosResponse> => {
  const response = await axios.get(`${otpAddress}${req.url}`, { headers: req.headers })
  return response
}
