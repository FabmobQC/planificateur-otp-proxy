interface GofsCoordinates {
  lat: number
  lon: number
}

interface GofsPhysicalAddress {
  streetAddress: string
}

interface GofsPricingApiRequest {
  from: {
    coordinates: GofsCoordinates
    physicalAddress?: GofsPhysicalAddress
  }
  to: {
    coordinates: GofsCoordinates
    physicalAddress?: GofsPhysicalAddress
  }
  departureTime?: string
  nrOfTravelers?: number
  useAssetTypes: string[]
  userGroups?: string[]
}

interface GofsPricingApiResponseOption {
  mainAssetType: {
    id: string
  }
  departureTime: string
  arrivalTime?: string
  from: {
    coordinates: GofsCoordinates
    physicalAddress?: GofsPhysicalAddress
  }
  to: {
    coordinates: GofsCoordinates
    physicalAddress?: GofsPhysicalAddress
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

interface GofsPricingApiResponse {
  validUntil: string
  options: GofsPricingApiResponseOption[]
}
