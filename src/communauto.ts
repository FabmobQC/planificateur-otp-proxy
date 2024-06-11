import fs from 'fs'
import convert from 'xml-js'

const xml = fs.readFileSync('./data/quebec_communauto_stations.xml').toString()
const json = convert.xml2json(xml)
const convertedObject = JSON.parse(json)
const stations = convertedObject.elements[0].elements.slice(1).map((item: any) => {
  return {
    id: item.attributes.StationID,
    no: item.attributes.StationNo,
    sector: item.attributes.Sector,
    zone: item.attributes.Zone,
    longitude: Number(item.attributes.Longitude),
    latitude: Number(item.attributes.Latitude),
    name: item.elements[0].cdata
  }
})
export const handleCommunautoStationsRequest = async (req: unknown): Promise<unknown[]> => {
  return stations
}
