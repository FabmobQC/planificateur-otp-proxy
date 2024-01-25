import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import * as turf from '@turf/helpers'
import { type AxiosResponse } from 'axios'
import { type ArtmFareZone } from '../transit_fare_zones/transit-fare-zone.js'
import { type FabMobItinerary, type FabMobPlanResponse, type Place } from '../types/fabmob-otp.js'
import { loadJsonFile } from './file-tools.js'
import { getOtpResult, type GraphQlRequest } from './otp.js'

const rtcFare = 3.40
const artmFare = 3.75
const artmFareAB = 4.50
const artmFareABC = 6.75
const artmFareABCD = 9.25

type ArtmFareZoneName = 'A' | 'B' | 'C' | 'D'

const artmFareZones = new Map<ArtmFareZoneName, ArtmFareZone>([
  ['A', loadJsonFile('transit_fare_zones/artm_zone_a.geojson') as unknown as ArtmFareZone],
  ['B', loadJsonFile('transit_fare_zones/artm_zone_b.geojson') as unknown as ArtmFareZone],
  ['C', loadJsonFile('transit_fare_zones/artm_zone_c.geojson') as unknown as ArtmFareZone],
  ['D', loadJsonFile('transit_fare_zones/artm_zone_d.geojson') as unknown as ArtmFareZone]
])

export const handleTransitRequest = async (req: GraphQlRequest): Promise<FabMobPlanResponse> => {
  const otpResult = await getOtpResult(req) as AxiosResponse<FabMobPlanResponse>
  const planResponse = otpResult.data
  planResponse.data.plan.itineraries.forEach((itinerary) => {
    if (checkIsRtc(itinerary)) {
      handleRtlFare(itinerary)
    } else {
      handleArtmFare(itinerary)
    }
  })
  return planResponse
}

const checkIsRtc = (itinerary: FabMobItinerary): boolean => {
  // The leg typing is currently incorrect
  return itinerary.legs.some((leg: any) => leg.agency?.name === 'Réseau de transport de la capitale (RTC)')
}

const handleRtlFare = (itinerary: FabMobItinerary): void => {
  itinerary.transitFare = rtcFare
}

const handleArtmFare = (itinerary: FabMobItinerary): void => {
  const artmFareZonesNames = findArtmFareZonesNames(itinerary)
  // order is important
  if (artmFareZonesNames.size === 1) {
    itinerary.transitFare = artmFare
  } else if (artmFareZonesNames.has('A') && artmFareZonesNames.has('D')) {
    itinerary.transitFare = artmFareABCD
  } else if (artmFareZonesNames.has('A') && artmFareZonesNames.has('C')) {
    itinerary.transitFare = artmFareABC
  } else if (artmFareZonesNames.has('A') && artmFareZonesNames.has('B')) {
    itinerary.transitFare = artmFareAB
  }
}

const findArtmFareZonesNames = (itinerary: FabMobItinerary): Set<ArtmFareZoneName> => {
  const artmFareZonesNames = new Set<ArtmFareZoneName>()
  itinerary.legs.forEach((leg) => {
    const artmFareZoneNameFrom = findArtmFareZoneName(leg.from)
    if (artmFareZoneNameFrom !== undefined) {
      artmFareZonesNames.add(artmFareZoneNameFrom)
    }
    const artmFareZoneNameTo = findArtmFareZoneName(leg.to)
    if (artmFareZoneNameTo !== undefined) {
      artmFareZonesNames.add(artmFareZoneNameTo)
    }
  })
  return artmFareZonesNames
}

const findArtmFareZoneName = (place: Place): ArtmFareZoneName | undefined => {
  for (const [artmFareZoneName, artmFareZone] of artmFareZones.entries()) {
    if (checkIsInArtmFareZone(artmFareZone, place)) {
      return artmFareZoneName
    }
  }
}

const checkIsInArtmFareZone = (artmFareZone: ArtmFareZone, place: Place): boolean => {
  const point = turf.point([place.lon, place.lat])
  for (const feature of artmFareZone.features) {
    if (booleanPointInPolygon(point, feature)) {
      return true
    }
  }
  return false
}
