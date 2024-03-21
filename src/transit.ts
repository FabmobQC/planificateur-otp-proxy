import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import * as turf from '@turf/helpers'
import { type AxiosResponse } from 'axios'
import { type ArtmFareZone } from '../transit_fare_zones/transit-fare-zone.js'
import { type FabMobItinerary, type FabMobPlanResponse, type Place } from '../types/fabmob-otp.js'
import { loadJsonFile } from './file-tools.js'
import { getOtpResult, type GraphQlRequest } from './otp.js'
import { handleMultipleStops } from './multiple-stops.js'

const artmFare = 3.75
const artmFareAB = 4.50
const artmFareABC = 6.75
const artmFareABCD = 9.25
const stmLine747Fare = 11.00
const rtcFare = 3.40
const stsFare = 3.50

type ArtmFareZoneName = 'A' | 'B' | 'C' | 'D'

const artmFareZones = new Map<ArtmFareZoneName, ArtmFareZone>([
  ['A', loadJsonFile('transit_fare_zones/artm_zone_a.geojson') as unknown as ArtmFareZone],
  ['B', loadJsonFile('transit_fare_zones/artm_zone_b.geojson') as unknown as ArtmFareZone],
  ['C', loadJsonFile('transit_fare_zones/artm_zone_c.geojson') as unknown as ArtmFareZone],
  ['D', loadJsonFile('transit_fare_zones/artm_zone_d.geojson') as unknown as ArtmFareZone]
])

export const handleTransitRequestWithMultipleStops = async (req: GraphQlRequest): Promise<FabMobPlanResponse | undefined> => {
  return await handleMultipleStops(req, handleTransitRequest)
}

export const handleTransitRequest = async (req: GraphQlRequest): Promise<FabMobPlanResponse> => {
  setSearchWindow(req)
  const otpResult = await getOtpResult(req) as AxiosResponse<FabMobPlanResponse>
  const planResponse = otpResult.data
  planResponse.data.plan.itineraries.forEach((itinerary) => {
    if (checkIsRtc(itinerary)) {
      itinerary.transitFare = rtcFare
    } else if (checkIsSts(itinerary)) {
      itinerary.transitFare = stsFare
    } else {
      handleArtmFare(itinerary)
    }
  })
  return planResponse
}

const setSearchWindow = (req: GraphQlRequest): void => {
  const oldQuery = req.body.query
  const searchWindowValue = 24 * 60 * 60 // 24 hours in seconds
  // Unfortunately, it seems there's no tool to modify a GraphQL query
  const newQuery = oldQuery.replace('plan(', `plan(\nsearchWindow: ${searchWindowValue}`)
  req.body.query = newQuery
}

const checkIsRtc = (itinerary: FabMobItinerary): boolean => {
  // The leg typing is currently incorrect
  return itinerary.legs.some((leg: any) => leg.agency?.name === 'Réseau de transport de la capitale (RTC)')
}

const checkIsSts = (itinerary: FabMobItinerary): boolean => {
  // The leg typing is currently incorrect
  return itinerary.legs.some((leg: any) => leg.agency?.name === 'Société de Transport de Sherbrooke')
}

const handleArtmFare = (itinerary: FabMobItinerary): void => {
  if (checkIsStmLine747(itinerary)) {
    itinerary.transitFare = stmLine747Fare
    return
  }
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
  } else if (artmFareZonesNames.size === 2 && artmFareZonesNames.has('C') && artmFareZonesNames.has('D')) {
    itinerary.transitFare = artmFare
  }
}

const checkIsStmLine747 = (itinerary: FabMobItinerary): boolean => {
  // The leg typing is currently incorrect
  return itinerary.legs.some(
    (leg: any) => leg.agency?.name === 'Société de transport de Montréal' && (leg.headsign === '747-E' || leg.headsign === '747-O')
  )
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
