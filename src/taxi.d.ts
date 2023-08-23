type TaxiAssetType = 'taxi-registry-standard' | 'taxi-registry-minivan' | 'taxi-registry-special-need'

interface TaxiPricingApiRequest extends GofsPricingApiRequest {
  to?: GofsPricingApiRequest['to']
  useAssetTypes: TaxiAssetType[]
}

interface TaxiPricingApiResponseOption extends GofsPrincingApiResponseOption {
  estimatedWaitTime: number
  estimatedTravelTime?: number
  booking: {
    agency: {
      id: string
      name: string
    }
    phoneNumber: string | null
    androidUri: string | null
    iosUri: string | null
    webUrl: string | null
  }
}

interface TaxiPricingApiResponse extends GofsPricingApiResponse {
  options: TaxiPricingApiResponseOption[]
}
