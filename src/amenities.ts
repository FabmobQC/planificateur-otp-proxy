import type { FeatureCollection, Polygon } from '@turf/helpers'
import { loadJsonFile } from './file-tools.js'

type Vecteur5Region =
  | 'Abitibi-Témiscamingue'
  | 'Centre-du-Québec'
  | 'Laurentide'

type Vecteur5OldType =
  | 'Education'
  | 'Grocery Store'
  | 'Health center'

type Vecteur5Type =
  | 'Education'
  | 'Épiceries'
  | 'Santé'

interface Vecteur5Amenity {
  'Nom': string
  'Latitude': string
  'Longitude': string
  'Type': Vecteur5Type
  'index_right': number
  'region': Vecteur5Region
  'mrc': string
  'NOM_COURT'?: string | null
}

interface Amenity {
  id: string
  name: string
  type: Vecteur5OldType
  longitude: number
  latitude: number
}

const mapNewTypeToOldType = (type: Vecteur5Type): Vecteur5OldType => {
  switch (type) {
    case 'Education':
      return 'Education'
    case 'Épiceries':
      return 'Grocery Store'
    case 'Santé':
      return 'Health center'
  }
}
const geojsonAmenitiesGrocery = loadJsonFile('./data/vecteur5/Epiceries_3_regions.geojson') as unknown as FeatureCollection<Polygon, Vecteur5Amenity>
const geojsonAmenitiesHealth = loadJsonFile('./data/vecteur5/Sante_3_regions.geojson') as unknown as FeatureCollection<Polygon, Vecteur5Amenity>
const geojsonAmenitiesEducation = loadJsonFile('./data/vecteur5/Scolaire_3_regions.geojson') as unknown as FeatureCollection<Polygon, Vecteur5Amenity>

const amenities: Amenity[] = [geojsonAmenitiesGrocery, geojsonAmenitiesHealth, geojsonAmenitiesEducation].flatMap((geojson) => {
  const fileAmenities: Amenity[] = []
  geojson.features.forEach((feature) => {
    if (feature.properties.Nom === null) {
      return
    }
    const amenity: Amenity = {
      id: `${feature.properties.Nom}-${feature.properties.Longitude}-${feature.properties.Latitude}`,
      name: feature.properties.Nom,
      type: mapNewTypeToOldType(feature.properties.Type),
      longitude: parseFloat(feature.properties.Longitude),
      latitude: parseFloat(feature.properties.Latitude)
    }
    fileAmenities.push(amenity)
  })
  return fileAmenities
})

export const handleAmenitiesRequest = async (req: unknown): Promise<unknown[]> => {
  return amenities
}
