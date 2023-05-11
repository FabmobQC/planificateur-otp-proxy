interface GofsCoordinates {
  lat: string
  lon: string
}

interface GofsPricingApiRequest {
  from: {
    coordinates: GofsCoordinates
  }
  to: {
    coordinates: GofsCoordinates
  }
  useAssetTypes: ['taxi-registry-standard-route'] | ['taxi-registry-minivan-route'] | ['axi-registry-special-need-route']
}

interface GofsPricingApiResponse {
  validUntil: string
  options: [
    {
      mainAssetType: {
        id: string
      }
      departureTime: string
      arrivalTime: string
      from: {
        coordinates: GofsCoordinates
      }
      to: {
        coordinates: GofsCoordinates
      }
      pricing: {
        estimated: boolean
        parts: [
          {
            amount: number
            currencyCode: string
          }
        ]
      }
    }
  ]
}
