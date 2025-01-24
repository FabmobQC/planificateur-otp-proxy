import fs from 'fs'
const buffer = fs.readFileSync('./data/quebec_administrative_regions.geojson')
const content = buffer.toString()

export const handleAdministrativeRegionsRequest = async (req: unknown): Promise<string> => {
  return content
}
