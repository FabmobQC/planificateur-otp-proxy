import 'dotenv/config'

if (process.env.TAXI_API_KEY === undefined) {
  throw new Error('TAXI_API_KEY is undefined. Please set it in .env file.')
}
export const taxiApiKey: string = process.env.TAXI_API_KEY

if (process.env.OTP_ADDRESS === undefined) {
  throw new Error('OTP_ADDRESS is undefined. Please set it in .env file.')
}
export const otpAddress: string = process.env.OTP_ADDRESS
