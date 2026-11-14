"""Descarga y estandariza secciones censales (INE 2025) y poblacion por seccion de Madrid (28079). Idempotente."""
import io, json, zipfile, datetime, pathlib, requests, pandas as pd, geopandas as gpd

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/ine"; PROC = ROOT / "data/processed"
RAW.mkdir(parents=True, exist_ok=True); PROC.mkdir(parents=True, exist_ok=True)
MUN = "28079"
URL_CART = "https://www.ine.es/prodyser/cartografia/seccionado_2025.zip"
TABLA = 31105  # Atlas de distribucion de renta de los hogares, Indicadores demograficos, Madrid (secciones)
URL_POB = f"https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/{TABLA}?nult=1"

# 1. Cartografia
zpath = RAW / "seccionado_2025.zip"
if not zpath.exists():
    zpath.write_bytes(requests.get(URL_CART, timeout=600).content)
ext = RAW / "seccionado_2025"
if not ext.exists():
    zipfile.ZipFile(zpath).extractall(ext)
shp = next(ext.rglob("*.shp"))
g = gpd.read_file(shp)
g = g[g.CUMUN == MUN].to_crs(25830)
sec = gpd.GeoDataFrame({"cusec": g.CUSEC.astype(str), "cod_distrito": g.CDIS.astype(str).str.zfill(2),
                        "cod_seccion": g.CSEC.astype(str).str.zfill(3)}, geometry=g.geometry.values, crs=25830)
sec.to_file(PROC / "secciones.gpkg", layer="secciones", driver="GPKG")

# 2. Poblacion
jpath = RAW / f"ine_tabla_{TABLA}.json"
if not jpath.exists():
    jpath.write_bytes(requests.get(URL_POB, timeout=600).content)
d = json.loads(jpath.read_text(encoding="utf-8"))
rows, years = [], set()
for x in d:
    n = x["Nombre"]
    if n.startswith("Madrid secci") and n.split(". ")[1] == "Población" and x["Data"]:
        v = x["Data"][-1]; years.add(v["Anyo"])
        rows.append(("28079" + n[15:20], int(v["Valor"])))
pob = pd.DataFrame(rows, columns=["cusec", "poblacion"]).drop_duplicates("cusec")
pob.to_parquet(PROC / "poblacion_secciones.parquet", index=False)

a, b = set(pob.cusec), set(sec.cusec)
print(f"secciones={len(sec)} pob_filas={len(pob)} total={pob.poblacion.sum()} año_pob={years}")
print(f"cusec en pob sin cartografia={len(a-b)}; en cartografia sin pob={len(b-a)}")
(PROC / "meta_ine.json").write_text(json.dumps({
    "cartografia_url": URL_CART, "cartografia_anio": 2025,
    "poblacion_url": URL_POB.replace("?nult=1", ""), "poblacion_fuente": "INE Atlas de distribucion de renta de los hogares, indicadores demograficos (tabla %d)" % TABLA,
    "poblacion_anio_referencia": sorted(years), "n_secciones": len(sec), "poblacion_total": int(pob.poblacion.sum()),
    "fecha_descarga": datetime.date.today().isoformat()}, indent=2, ensure_ascii=False), encoding="utf-8")
