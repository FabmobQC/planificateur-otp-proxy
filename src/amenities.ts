import type { FeatureCollection, Polygon } from '@turf/helpers'
import { loadJsonFile } from './file-tools.js'

type Vecteur5Region =
  | 'Centre-du-Québec'
  | 'Laurentide'

type Vecteur5Type =
  | 'Education'
  | 'Grocery Store'
  | 'Health center'

interface Vecteur5Amenity {
  'id-unique': string
  'fid': number
  'Nom': string
  'lon': number
  'lat': number
  'Type': Vecteur5Type
  'layer': string
  'Code MRC': number
  'Nom MRC': string
  'Région': Vecteur5Region
}

interface Amenity {
  id: string
  name: string
  type: string
  longitude: number
  latitude: number
}

const geojsonAmenitiesDrummondville = loadJsonFile('./data/vecteur5/amenities_drummondville.geojson') as unknown as FeatureCollection<Polygon, Vecteur5Amenity>
const geojsonAmenitiesLaurentides = loadJsonFile('./data/vecteur5/amenities_laurentides.geojson') as unknown as FeatureCollection<Polygon, Vecteur5Amenity>

const amenities: Amenity[] = [geojsonAmenitiesDrummondville, geojsonAmenitiesLaurentides].flatMap((geojson) => {
  return geojson.features.map((feature) => ({
    id: feature.properties['id-unique'],
    name: feature.properties.Nom,
    type: feature.properties.Type,
    longitude: feature.properties.lon,
    latitude: feature.properties.lat
  }))
})

export const handleAmenitiesRequest = async (req: unknown): Promise<unknown[]> => {
  return amenities
}
