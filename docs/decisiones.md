# Decisiones tomadas sin consultar

Formato: una línea por decisión (qué y por qué).

- Inicio del speedrun: 2026-11-14 13:05 (hora local).
- Sin `tippecanoe` en Windows: los edificios se exportan como GeoJSON de puntos con coordenadas redondeadas y propiedades mínimas en vez de PMTiles (evita instalar toolchain; GitHub Pages sirve gzip).
- Contratos intermedios fijados en `data/processed/` (GeoPackage en EPSG:25830) para que cada fuente se descargue en paralelo.
- Estaciones BiciMAD desde el feed GBFS oficial (madrid.publicbikesystem.net, station_information.json) — no requiere API key y trae coordenadas; se conservan las 678 estaciones (30 quedan fuera del término municipal, no se filtran aquí).
- Límites de distritos y barrios desde los shapefiles oficiales del Geoportal del Ayuntamiento de Madrid (sin fallback OSM) — descarga directa correcta, 21 y 131 registros en EPSG:25830.
- Se usa solo el GML `building` de Catastro (no buildingpart ni otherconstruction) — contiene currentUse y numberOfDwellings a nivel de edificio y pesa mucho menos.
- Se guarda como fecha de datos el `updated` del feed ATOM del dataset 28900 — el GML no trae fecha global fiable.
- uso nulo se conserva como nulo (no se imputa) — el filtrado se hace en fases posteriores.
- Población por sección tomada del Atlas de renta INE (tabla 31105, indicadores demográficos, año 2024) en lugar de padrón 2025 — INE no publica población 2025 por sección vía API; los 2.462 códigos coinciden al 100% con la cartografía 2025
- Punto de cada edificio residencial = `representative_point()` — garantiza que cae dentro del polígono (el centroide puede quedar fuera en formas en L/U)
- 2 edificios residenciales fuera de toda sección → asignados a la sección más cercana (`asignacion="cercana"`) — evitar perder población
- 2 edificios sin barrio por punto-en-polígono → asignados al barrio más cercano — la agregación por barrio/distrito se hace vía edificios
- 1 sección con población pero sin edificios residenciales → 0 con otro uso con viviendas; resuelta con punto sintético `SECCION_<cusec>` (`centroide_seccion`) con toda la población — conservar el total del padrón
- Población por edificio se mantiene en float (sin redondear) en el reparto — el redondeo a entero solo se aplica en la exportación
- Reparto proporcional a `n_viviendas` dentro de cada sección; 0 secciones con población 0 y edificios residenciales
- Red peatonal con useful_tags_way mínimas (highway, name) y logging por pasos — para reducir memoria con 8 GB y poder diagnosticar la descarga OSM

- 12 estaciones con distancia de enganche a la red >150 m — se mantienen (estaciones reales; enganche con peso = distancia)
- 1973 edificios sin estación alcanzable a ≤1500 m por red — distancia NaN, base nula y nivel rojo
- Distancia = d_perp al tramo más cercano + camino por red hasta el extremo más cercano (Dijkstra multifuente, límite 1600 m) — método fijado en el plan
- edificios.geojson queda en 16,7 MB (4 decimales) — se acepta porque se carga solo al acercar el zoom y GitHub Pages lo sirve comprimido con gzip.
