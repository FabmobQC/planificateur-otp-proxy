# Data

## navette_nature_destinations.json
Gathered manually

## quebec_administrative_regions.geojson
From donneesquebec.ca: https://www.donneesquebec.ca/recherche/fr/dataset/decoupages-administratifs
Découpages administratifs 1/100 000 (format SHP)
``` python
import geopandas as gpd 
gdf = gpd.read_file("dat/SHP/regio_s.shp")
gdf.to_file("regions-left-handed.geojson", driver="GeoJSON")
```

Then apply right-hand rule:
``` sh
npx geojson-rewind regions-left-handed.geojson regions.geojson
```

## quebec_communauto_stations.xml
Downloaded from Communauto's api: https://www.reservauto.net/Scripts/Client/Ajax/Stations/ListStations.asp?CityID=90&LanguageID=2&BranchID=1

## quebec_touristic_places.json
Gathered manually from OSM's data.

## quebec_touristic_places_2.csv
Gathered manually

# vecteur5
Provided by Vecteur5