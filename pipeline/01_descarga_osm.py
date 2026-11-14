"""Descarga la red peatonal OSM de Madrid municipio (+1 km) y la guarda en parquet/gpkg."""
import json, time, datetime as dt
from pathlib import Path
import osmnx as ox, networkx as nx, geopandas as gpd, pandas as pd
from shapely.geometry import LineString

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)
f_nod, f_ari, f_meta = OUT/"red_nodos.parquet", OUT/"red_aristas.gpkg", OUT/"meta_osm.json"
if f_nod.exists() and f_ari.exists() and f_meta.exists():
    print("Salidas existentes; nada que hacer"); raise SystemExit

ox.settings.cache_folder = str(ROOT / "cache")
ox.settings.use_cache = True
ox.settings.requests_timeout = 600
ox.settings.log_console = False
ox.settings.useful_tags_way = ["highway", "name"]
import gc
def log(m): print(time.strftime("%H:%M:%S"), m, flush=True)
ENDPOINTS = ["https://overpass-api.de/api", "https://overpass.private.coffee/api", "https://overpass.kumi.systems/api"]

t0 = time.time()
g = ox.geocode_to_gdf("Madrid, Comunidad de Madrid, España")
g = g.to_crs(25830)
print("area km2:", round(g.geometry.area.sum()/1e6, 1))
poly = gpd.GeoSeries([g.geometry.union_all().buffer(1000)], crs=25830).to_crs(4326).iloc[0]

G = None
for attempt in range(6):
    ep = ENDPOINTS[attempt % len(ENDPOINTS)]
    ox.settings.overpass_url = ep
    try:
        print("Intento", attempt+1, ep, flush=True)
        G = ox.graph_from_polygon(poly, network_type="walk", simplify=True, retain_all=False)
        break
    except Exception as e:
        print("Fallo:", repr(e)[:200], flush=True); time.sleep(20)
if G is None: raise SystemExit("No se pudo descargar")

log("grafo construido: %d nodos" % len(G))
comp = max(nx.weakly_connected_components(G), key=len)
G = G.subgraph(comp).copy()
log("LCC ok"); G = ox.project_graph(G, to_crs="EPSG:25830"); gc.collect(); log("proyectado")
nodes, edges = ox.graph_to_gdfs(G)
edges = edges.reset_index()
xy = nodes[["x", "y"]]
geoms = edges.geometry.copy()
miss = geoms.isna()
if miss.any():
    geoms[miss] = [LineString([(xy.at[u,"x"],xy.at[u,"y"]),(xy.at[v,"x"],xy.at[v,"y"])])
                   for u, v in zip(edges.u[miss], edges.v[miss])]
edges["geometry"] = geoms
edges["a"] = edges[["u","v"]].min(axis=1); edges["b"] = edges[["u","v"]].max(axis=1)
edges = edges[edges.a != edges.b].sort_values("length").drop_duplicates(["a","b"])
edges = edges.assign(u=edges.a.astype("int64"), v=edges.b.astype("int64"))
ar = gpd.GeoDataFrame(edges[["u","v","length"]].astype({"length":float}),
                      geometry=edges.geometry.values, crs=25830)
# nodos: solo los que quedan en alguna arista
ids = set(ar.u) | set(ar.v)
nd = pd.DataFrame({"node_id": nodes.index.astype("int64"), "x": nodes.x.astype(float).values, "y": nodes.y.astype(float).values})
nd = nd[nd.node_id.isin(ids)].reset_index(drop=True)
log("aristas listas"); nd.to_parquet(f_nod, index=False)
ar.to_file(f_ari, layer="aristas", driver="GPKG")
meta = dict(fecha_descarga=dt.date.today().isoformat(), overpass=ep, nodos=len(nd), aristas=len(ar),
            longitud_total_km=round(float(ar.length.sum())/1000, 1), area_municipio_km2=round(g.geometry.area.sum()/1e6,1))
f_meta.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
print(meta, "segundos:", round(time.time()-t0))
