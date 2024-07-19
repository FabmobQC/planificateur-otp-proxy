import { type FeatureCollection } from '@turf/helpers'
import { loadCsvFile, loadJsonFile } from './file-tools.js'

type TouristicPlaceCategorie =
  | 'Patrimoine religieux'
  | 'Hébergement'
  | 'Restaurant / bar'
  | 'Magasinage'
  | 'Nature'
  | 'Spectacle / festival'
  | 'Tour organisé'
  | 'Patrimoine historique'
  | 'Musée'
  | 'Spa / détente'
  | 'Culture'
  | 'Attraction'

interface TouristicPlace {
  'Adresse OSM'?: string
  Catégorie: TouristicPlaceCategorie
  Latitude: number
  Longitude: number
  'Nom activité': string
  Ville?: string
  adresse?: string
  // eslint-disable-next-line camelcase
  adresse_for_Nominatim: string
}

const touristicPlacesJson = loadJsonFile('./data/quebec_touristic_places.json') as unknown as FeatureCollection<TouristicPlace>
const navetteNatureDestinationsJson = loadJsonFile('./data/navette_nature_destinations.json') as unknown as TouristicPlace[]

const touristicPlaces2ParsedResult = loadCsvFile<any>('./data/quebec_touristic_places_2.csv')

const touristicPlaces2 = touristicPlaces2ParsedResult.data.map<TouristicPlace>((place) => {
  const [latitudeString, longitudeString] = place['Coordos GPS']?.split(' ')
  return {
    Catégorie: place.Type as TouristicPlaceCategorie,
    Latitude: Number(latitudeString),
    Longitude: Number(longitudeString),
    'Nom activité': place['Nom activité'],
    adresse_for_Nominatim: place.Adresse
  }
})

const touristicPlaces: TouristicPlace[] = [
  ...touristicPlacesJson.features.map((feature: any) => feature.properties),
  ...navetteNatureDestinationsJson,
  ...touristicPlaces2
]

export const handleTouristicPlacesRequest = async (req: unknown): Promise<unknown[]> => {
  return touristicPlaces
}
