"""01 - Descarga y estandariza estaciones BiciMAD (GBFS) y limites de Madrid (distritos, barrios)."""
import io, json, zipfile, datetime as dt
from pathlib import Path
import requests, pandas as pd, geopandas as gpd

ROOT = Path(__file__).resolve().parent.parent
RAW_B = ROOT / "data/raw/bicimad"; RAW_L = ROOT / "data/raw/limites"; PROC = ROOT / "data/processed"
for p in (RAW_B, RAW_L, PROC): p.mkdir(parents=True, exist_ok=True)
CRS = "EPSG:25830"
HOY = dt.date.today().isoformat()
URL_GBFS = "https://madrid.publicbikesystem.net/customer/gbfs/v2/en/station_information.json"
BASE_GEO = "https://geoportal.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/LIMITES_ADMINISTRATIVOS/"
URL_DIS, URL_BAR = BASE_GEO + "Distritos/Distritos.zip", BASE_GEO + "Barrios/Barrios.zip"

def get(url):
    r = requests.get(url, timeout=120); r.raise_for_status(); return r.content

# 1. Estaciones
existentes = sorted(RAW_B.glob("station_information_*.json"))
raw_f = existentes[-1] if existentes else RAW_B / f"station_information_{HOY}.json"
if not existentes: raw_f.write_bytes(get(URL_GBFS))
fecha_est = raw_f.stem.split("_")[-1]
st = pd.DataFrame(json.loads(raw_f.read_text(encoding="utf-8"))["data"]["stations"])
st = st.dropna(subset=["lat", "lon"]).drop_duplicates("station_id")
st = st[(st.lat != 0) & (st.lon != 0)]
bases = gpd.GeoDataFrame(
    {"base_id": st.station_id.astype(str), "nombre": st.name.astype(str).str.strip()},
    geometry=gpd.points_from_xy(st.lon, st.lat), crs="EPSG:4326").to_crs(CRS)
bases = bases.drop_duplicates(subset=["nombre", "geometry"])
bases.to_file(PROC / "bases.gpkg", layer="bases", driver="GPKG")

# 2. Limites
def shp(url, name):
    d = RAW_L / name
    if not list(d.glob("*.shp")):
        d.mkdir(exist_ok=True); zipfile.ZipFile(io.BytesIO(get(url))).extractall(d)
    return gpd.read_file(next(d.glob("*.shp")), encoding="utf-8").to_crs(CRS)

dis, bar = shp(URL_DIS, "distritos"), shp(URL_BAR, "barrios")
distritos = gpd.GeoDataFrame({"cod_distrito": dis.COD_DIS_TX.astype(str).str.zfill(2),
    "nombre": dis.NOMBRE}, geometry=dis.geometry, crs=CRS).sort_values("cod_distrito").reset_index(drop=True)
barrios = gpd.GeoDataFrame({"cod_barrio": bar.COD_BAR.astype(str).str.zfill(3),
    "nombre": bar.NOMBRE, "cod_distrito": bar.COD_DIS_TX.astype(str).str.zfill(2)},
    geometry=bar.geometry, crs=CRS).sort_values("cod_barrio").reset_index(drop=True)
muni = gpd.GeoDataFrame({"nombre": ["Madrid"]}, geometry=[distritos.geometry.union_all()], crs=CRS)
distritos.to_file(PROC / "distritos.gpkg", layer="distritos", driver="GPKG")
barrios.to_file(PROC / "barrios.gpkg", layer="barrios", driver="GPKG")
muni.to_file(PROC / "municipio.gpkg", layer="municipio", driver="GPKG")

# 3. Metadatos
meta = {"fecha_descarga": HOY, "fecha_estaciones": fecha_est, "crs": CRS,
        "fuentes": {"bicimad_gbfs_station_information": URL_GBFS, "distritos": URL_DIS, "barrios": URL_BAR},
        "n": {"bases": len(bases), "distritos": len(distritos), "barrios": len(barrios)}}
(PROC / "meta_bicimad_limites.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
print(meta["n"], "bases dentro del municipio:", int(bases.within(muni.geometry.iloc[0]).sum()))
