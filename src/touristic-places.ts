import { loadJsonFile } from './file-tools.js'

const touristicPlacesJson = loadJsonFile('./data/quebec_touristic_places.json') as any
const touristicPlaces = touristicPlacesJson.features.map((feature: any) => feature.properties)

export const handleTouristicPlacesRequest = async (req: unknown): Promise<unknown[]> => {
  return touristicPlaces
}
