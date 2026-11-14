import geopandas as gpd, pandas as pd, json, os, datetime
P = "data/processed/"; W = "web/data/"
def dump(gdf, path, dec=5):
    g = gdf.to_crs(4326).copy()
    g["geometry"] = g.geometry.set_precision(10 ** -dec)
    d = json.loads(g.to_json(drop_id=True, na="null", show_bbox=False))
    json.dump(d, open(path, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
ag = json.load(open(P + "agregados.json", encoding="utf-8"))
b = pd.DataFrame(gpd.read_parquet(P + "edificios_distancias.parquet"))
b["geometry"] = None
# --- Edificios: PMTiles (MVT) con huellas reales de Catastro ---
import gzip, mercantile, numpy as np, shapely, mapbox_vector_tile
from shapely import affinity
from shapely.geometry import box
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, Compression, TileType
bd = b[~b.edif_id.astype(str).str.startswith("SECCION_")]
fp = gpd.read_file(P + "edificios.gpkg", layer="edificios")[["edif_id", "geometry"]]
fp = fp[~fp.edif_id.duplicated()]
t = fp.merge(pd.DataFrame(bd.drop(columns="geometry"))[["edif_id", "poblacion", "distancia", "nivel", "base_nombre"]], on="edif_id")
t = gpd.GeoDataFrame(t, geometry="geometry", crs=fp.crs).to_crs(3857)
t = t[~t.geometry.is_empty & t.geometry.notna()].reset_index(drop=True)
t["p"] = t.poblacion.round().astype(int)
q = [float(x) for x in np.quantile(t.p, [.2, .4, .6, .8])]
CORTES = [int(round(x)) for x in q]
t["k"] = sum((t.p > c).astype(int) for c in CORTES)
t["area"] = t.geometry.area
print("edificios en tiles:", len(t), "cortes k:", CORTES, "sin huella:", len(bd) - len(t))
props = [{"p": int(p), "n": int(n), **({"d": int(round(d))} if pd.notna(d) else {}), **({"b": str(bn)} if isinstance(bn, str) else {}), "k": int(k)}
         for p, n, d, bn, k in zip(t.p, t.nivel, t.distancia, t.base_nombre, t.k)]
SIMP = {12: (2.0, 30), 13: (1.0, 30)}
out = W + "edificios.pmtiles"
EXT = 4096; Z0, Z1 = 12, 16
ntiles = 0
with open(out, "wb") as fh:
    wr = Writer(fh)
    for z in range(Z0, Z1 + 1):
        tol, amin = SIMP.get(z, (0, 0))
        idx = np.where(t.area.values >= amin)[0]
        geoms = t.geometry.values[idx]
        if tol: geoms = shapely.simplify(geoms, tol)
        bnds = shapely.bounds(geoms); tmap = {}
        for j, (x0, y0, x1, y1) in enumerate(bnds):
            if np.isnan(x0): continue
            w0, s0 = mercantile.lnglat(x0, y0); e0, n0 = mercantile.lnglat(x1, y1)
            for tl in mercantile.tiles(w0, s0, e0, n0, z, truncate=True):
                tmap.setdefault((tl.x, tl.y), []).append(j)
        for (x, y), js in sorted(tmap.items(), key=lambda kv: zxy_to_tileid(z, *kv[0])):
            bb = mercantile.xy_bounds(x, y, z); sc = EXT / (bb.right - bb.left)
            clip = box(-64, -64, EXT + 64, EXT + 64); feats = []
            for j in js:
                g = affinity.affine_transform(geoms[j], [sc, 0, 0, -sc, -bb.left * sc, bb.top * sc])
                g = shapely.set_precision(g.intersection(clip), 1.0)
                if g.is_empty: continue
                if not g.is_valid: g = shapely.make_valid(g)
                g = shapely.get_parts(g); g = [p for p in g if p.geom_type == "Polygon" and not p.is_empty]
                if not g: continue
                feats.append({"geometry": g[0] if len(g) == 1 else shapely.MultiPolygon(g), "properties": props[idx[j]]})
            if not feats: continue
            data = mapbox_vector_tile.encode([{"name": "edificios", "features": feats}], default_options={"extents": EXT, "y_coord_down": True})
            wr.write_tile(zxy_to_tileid(z, x, y), gzip.compress(data, 9, mtime=0)); ntiles += 1
        print("z", z, "tiles acumulados", ntiles, flush=True)
    bx = t.to_crs(4326).total_bounds
    wr.finalize({"tile_type": TileType.MVT, "tile_compression": Compression.GZIP, "min_zoom": Z0, "max_zoom": Z1,
                 "min_lon_e7": int(bx[0] * 1e7), "min_lat_e7": int(bx[1] * 1e7), "max_lon_e7": int(bx[2] * 1e7), "max_lat_e7": int(bx[3] * 1e7),
                 "center_zoom": 13, "center_lon_e7": int((bx[0] + bx[2]) / 2 * 1e7), "center_lat_e7": int((bx[1] + bx[3]) / 2 * 1e7)},
                {"name": "edificios", "format": "pbf", "minzoom": str(Z0), "maxzoom": str(Z1), "type": "overlay",
                 "vector_layers": [{"id": "edificios", "fields": {"p": "Number", "d": "Number", "n": "Number", "b": "String", "k": "Number"}, "minzoom": Z0, "maxzoom": Z1}]})
print("pmtiles", round(os.path.getsize(out) / 1e6, 2), "MB", ntiles, "tiles")
if os.path.exists(W + "edificios.geojson"): os.remove(W + "edificios.geojson")
dnames = {d["cod"]: d["nombre"] for d in ag["distritos"]}
FL = [p + k for p in ("",) for k in ("pob", "pob_v", "pob_a", "pob_r", "pct_v", "pct_a", "pct_r")]
def poly(layer, key, rows, tol, extra=()):
    g = gpd.read_file(P + layer + ".gpkg")
    g["cod"] = g[key]
    if "nombre" not in g: g["nombre"] = None
    df = pd.DataFrame(rows).set_index("cod")[FL]
    g = g.join(df, on="cod")
    for c in FL:
        g[c] = g[c].fillna(0.0) if "pct" in c else g[c].fillna(0).astype(int)
    if "distrito" in extra: g["distrito"] = g.cod_distrito.map(dnames)
    g = g[["cod", "nombre"] + list(extra) + FL + ["geometry"]].copy()
    g["geometry"] = g.geometry.simplify(tol, preserve_topology=True)
    return g
dump(poly("secciones", "cusec", ag["secciones"], 5), W + "secciones.geojson")
dump(poly("barrios", "cod_barrio", ag["barrios"], 10, ("cod_distrito", "distrito")), W + "barrios.geojson")
dump(poly("distritos", "cod_distrito", ag["distritos"], 10), W + "distritos.geojson")
dump(gpd.read_file(P + "bases.gpkg", layer="bases")[["base_id", "nombre", "geometry"]], W + "bases.geojson")  # solo base_id/nombre; 07_ranking_bases.py (tras 06) lo reescribe con el ranking
strip = lambda o: {k: v for k, v in o.items() if not k.startswith(("a_", "m_"))}
json.dump({"ciudad": strip(ag["ciudad"]), "distritos": [strip(x) for x in ag["distritos"]], "barrios": [strip(x) for x in ag["barrios"]]}, open(W + "agregados.json", "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
m = lambda f: json.load(open(P + f, encoding="utf-8"))
bl, ine, cat = m("meta_bicimad_limites.json"), m("meta_ine.json"), m("meta_catastro.json")
try: osm = m("meta_osm.json")
except Exception: osm = {}
f = bl["fuentes"]
hoy = datetime.date.today().isoformat()
fu = [
 {"nombre": "BiciMAD GBFS station_information", "url": f["bicimad_gbfs_station_information"], "fecha_descarga": bl["fecha_descarga"], "referencia": bl.get("fecha_estaciones")},
 {"nombre": "Límites administrativos (distritos y barrios), Ayuntamiento de Madrid", "url": f["distritos"], "fecha_descarga": bl["fecha_descarga"], "referencia": "vigente en la descarga"},
 {"nombre": "INE cartografía de secciones censales", "url": ine["cartografia_url"], "fecha_descarga": ine["fecha_descarga"], "referencia": str(ine["cartografia_anio"])},
 {"nombre": ine["poblacion_fuente"], "url": ine["poblacion_url"], "fecha_descarga": ine["fecha_descarga"], "referencia": str(ine["poblacion_anio_referencia"][0])},
 {"nombre": "Catastro INSPIRE Buildings", "url": cat["url"], "fecha_descarga": cat["fecha_descarga"], "referencia": cat["fecha_datos"][:10]},
 {"nombre": "OpenStreetMap (red viaria peatonal)", "url": "https://www.openstreetmap.org", "fecha_descarga": osm.get("fecha_descarga", hoy), "referencia": str(osm.get("fecha_datos", osm.get("referencia", "fecha de descarga")))}]
json.dump({"generado": hoy, "cortes_poblacion_edificio": CORTES, "parametros": {"umbral_verde": 250, "umbral_amarillo": 500, "corte": 1500}, "fuentes": fu},
          open(W + "metadata.json", "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
for n in sorted(os.listdir(W)): print(n, round(os.path.getsize(W + n) / 1e6, 2), "MB")
