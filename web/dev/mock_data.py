"""Genera datos MOCK en web/data/ para probar la web. El pipeline real los sobrescribe."""
import json, random, datetime, pathlib
random.seed(1)
OUT = pathlib.Path(__file__).resolve().parent.parent / "data"
OUT.mkdir(exist_ok=True)
LAT0, LON0 = 40.42, -3.70
def dump(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
def pcts(v, a, r):
    t = v + a + r or 1
    return dict(pct_v=round(100*v/t, 1), pct_a=round(100*a/t, 1), pct_r=round(100*r/t, 1))
def agg(v, a, r):
    return dict(pob=v+a+r, pob_v=v, pob_a=a, pob_r=r, **pcts(v, a, r))
def poly(x0, y0, x1, y1):
    return {"type": "Polygon", "coordinates": [[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}
# edificios
bases = [(LON0+random.uniform(-.06,.06), LAT0+random.uniform(-.04,.04)) for _ in range(40)]
import math
def dist(lon, lat):
    best = (1e9, None)
    for i, (bx, by) in enumerate(bases):
        d = math.hypot((lon-bx)*84000, (lat-by)*111000)
        if d < best[0]: best = (d, i)
    return best
feats = []
bld = []
for _ in range(800):
    lon, lat = LON0+random.gauss(0,.04), LAT0+random.gauss(0,.025)
    d, i = dist(lon, lat); d = int(d*1.3)
    n = 0 if d < 250 else 1 if d < 500 else 2
    bld.append((lon, lat, random.randint(5, 300), None if d > 1500 else d, n, i))
    feats.append({"type":"Feature","geometry":{"type":"Point","coordinates":[round(lon,6),round(lat,6)]},
      "properties":{"p":bld[-1][2],"d":bld[-1][3],"n":n,"b":f"Base {i+1} - Calle Mock" if d<=1500 else None}})
dump("edificios.geojson", {"type":"FeatureCollection","features":feats})
dump("bases.geojson", {"type":"FeatureCollection","features":[
  {"type":"Feature","geometry":{"type":"Point","coordinates":[round(x,6),round(y,6)]},
   "properties":{"base_id":i+1,"nombre":f"Base {i+1} - Calle Mock"}} for i,(x,y) in enumerate(bases)]})
def grid(nx, ny, x0, y0, w, h, mk):
    fs = []
    for i in range(nx):
        for j in range(ny):
            a, b = x0+i*w, y0+j*h
            c = (a+w/2, b+h/2)
            inside = [t for t in bld if a <= t[0] < a+w and b <= t[1] < b+h]
            v = sum(t[2] for t in inside if t[4]==0); am = sum(t[2] for t in inside if t[4]==1); r = sum(t[2] for t in inside if t[4]==2)
            if not inside: v, am, r = 0, 0, 100
            fs.append((poly(a,b,a+w,b+h), mk(i,j), (v,am,r)))
    return fs
def collection(items):
    return {"type":"FeatureCollection","features":[{"type":"Feature","geometry":g,"properties":{**p,**agg(*s)}} for g,p,s in items]}
x0, y0 = LON0-.12, LAT0-.075
sec = grid(24, 20, x0, y0, .01, .0075, lambda i,j: {"cod": f"28079{i:02d}{j:03d}", "nombre": None})
dump("secciones.geojson", collection(sec))
bar = grid(8, 5, x0, y0, .03, .03, lambda i,j: {"cod": f"79{i}{j}", "nombre": f"Barrio {i}-{j}", "cod_distrito": f"{i//2+1:02d}", "distrito": f"Distrito {i//2+1}"})
dump("barrios.geojson", collection(bar))
dis = grid(4, 2, x0, y0, .06, .075, lambda i,j: {"cod": f"{i*2+j+1:02d}", "nombre": f"Distrito {i*2+j+1}"})
dump("distritos.geojson", collection(dis))
# distritos desde barrios para coherencia
def sumb(items):
    return tuple(sum(s[k] for _,_,s in items) for k in range(3))
dd = {}
for g,p,s in bar:
    dd.setdefault((p["cod_distrito"], p["distrito"]), []).append((g,p,s))
dist_list = [{"cod":c,"nombre":n,**agg(*sumb(v))} for (c,n),v in sorted(dd.items())]
bar_list = [{"cod":p["cod"],"nombre":p["nombre"],"cod_distrito":p["cod_distrito"],"distrito":p["distrito"],**agg(*s)} for g,p,s in bar]
dump("agregados.json", {"ciudad": agg(*sumb(bar)), "distritos": dist_list, "barrios": bar_list})
dump("metadata.json", {"generado": datetime.date.today().isoformat(),
  "parametros":{"umbral_verde":250,"umbral_amarillo":500,"corte":1500},
  "fuentes":[{"nombre":"MOCK Padron municipal","url":"https://datos.madrid.es","fecha_descarga":"2026-01-01","referencia":"2025"},
             {"nombre":"MOCK OpenStreetMap","url":"https://www.openstreetmap.org","fecha_descarga":"2026-01-01","referencia":"2026"}]})
print("ok", OUT)
