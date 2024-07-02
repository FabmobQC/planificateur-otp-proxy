import { loadJsonFile } from './file-tools.js'

const touristicPlacesJson = loadJsonFile('./data/quebec_touristic_places.json') as any
const navetteNatureDestinationsJson = loadJsonFile('./data/navette_nature_destinations.json') as any
const touristicPlaces = [
  ...touristicPlacesJson.features.map((feature: any) => feature.properties),
  ...navetteNatureDestinationsJson
]

export const handleTouristicPlacesRequest = async (req: unknown): Promise<unknown[]> => {
  return touristicPlaces
}
