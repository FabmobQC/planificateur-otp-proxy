from typing import TypedDict
import geopandas as gpd  # type: ignore # Has no stubs

shp_path: str = "BDAT(adm)_SHP/Bdat/SHP/munic_s.shp"
destination_path: str = "../"

artm_zone_a_municipalities: list[str] = [
    "Baie-D'Urfé",
    "Beaconsfield",
    "Côte-Saint-Luc",
    "Dollard-des-Ormeaux",
    "Dorval",
    "Hampstead",
    "Kirkland",
    "L'Île-Dorval",
    "Montréal",
    "Montréal-Est",
    "Montréal-Ouest",
    "Mont-Royal",
    "Pointe-Claire",
    "Sainte-Anne-de-Bellevue",
    "Senneville",
    "Westmount",
]
artm_zone_b_municipalities: list[str] = [
    "Boucherville",
    "Brossard",
    "Laval",
    "Longueuil",
    "Saint-Bruno-de-Montarville",
    "Saint-Lambert",
]
artm_zone_c_municipalities: list[str] = [
    "Blainville",
    "Boisbriand",
    "Bois-des-Filion",
    "Charlemagne",
    "Deux-Montagnes",
    "L'Assomption",
    "Lorraine",
    "Mascouche",
    "Mirabel",
    "Oka",
    "Pointe-Calumet",
    "Repentigny",
    "Rosemère",
    "Sainte-Anne-des-Plaines",
    "Sainte-Marthe-sur-le-Lac",
    "Sainte-Thérèse",
    "Saint-Eustache",
    "Saint-Jérôme",
    "Saint-Joseph-du-Lac",
    "Saint-Sulpice",
    "Terrebonne",
    "Beauharnois",
    "Beloeil",
    "Candiac",
    "Carignan",
    "Chambly",
    "Châteauguay",
    "Contrecoeur",
    "Delson",
    "Hudson",
    "Kahnawake",
    "La Prairie",
    "Léry",
    "L'Île-Perrot",
    "McMasterville",
    "Mercier",
    "Mont-Saint-Hilaire",
    "Notre-Dame-de-l'Île-Perrot",
    "Otterburn Park",
    "Pincourt",
    "Richelieu",
    "Saint-Amable",
    "Saint-Basile-le-Grand",
    "Saint-Constant",
    "Sainte-Catherine",
    "Sainte-Julie",
    "Saint-Lazare",
    "Saint-Mathias-sur-Richelieu",
    "Saint-Mathieu-de-Beloeil",
    "Saint-Philippe",
    "Terrasse-Vaudreuil",
    "Varennes",
    "Vaudreuil-Dorion",
    "Verchères",
]
artm_zone_d_municipalities: list[str] = [
    "L'Épiphanie",
    "Marieville",
    "Rigaud",
    "Sainte-Madeleine",
    "Sainte-Marie-Madeleine",
    "Sainte-Martine",
    "Saint-Hyacinthe",
    "Saint-Placide",
]


class ZoneInfo(TypedDict):
    name: str
    municipalities: list[str]


zones_infos: list[ZoneInfo] = [
    {
        "name": "artm_zone_a",
        "municipalities": artm_zone_a_municipalities,
    },
    {
        "name": "artm_zone_b",
        "municipalities": artm_zone_b_municipalities,
    },
    {
        "name": "artm_zone_c",
        "municipalities": artm_zone_c_municipalities,
    },
    {
        "name": "artm_zone_d",
        "municipalities": artm_zone_d_municipalities,
    },
]


def validate_zone_municipalities(
    zone_infos: ZoneInfo, gdf_municipalities_set: set[str]
) -> bool:
    zone_municipalities_set = set(zone_infos["municipalities"])
    missing_municipalities = zone_municipalities_set - gdf_municipalities_set
    if missing_municipalities:
        print(
            f"Missing municipalities for {zone_infos['name']}: {missing_municipalities}"
        )
        return False
    return True


def extract_zone(zone_infos: ZoneInfo, gdf) -> None:
    zone = gdf[gdf["MUS_NM_MUN"].isin(zone_infos["municipalities"])]
    zone.to_file(f"{destination_path}{zone_infos['name']}.geojson", driver="GeoJSON")


def extract_zones() -> None:
    gdf = gpd.read_file(shp_path)
    gdf_municipalities_set = set(gdf["MUS_NM_MUN"])
    for zone_infos in zones_infos:
        is_valid = validate_zone_municipalities(zone_infos, gdf_municipalities_set)
        if not is_valid:
            continue
        extract_zone(zone_infos, gdf)


if __name__ == "__main__":
    extract_zones()
