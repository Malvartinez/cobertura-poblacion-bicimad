# Decisiones tomadas sin consultar

Formato: una línea por decisión (qué y por qué).

- Inicio del speedrun: 2026-11-14 13:05 (hora local).
- (SUPERADA: edificios ahora en PMTiles generado en Python) Sin `tippecanoe` en Windows: los edificios se exportan como GeoJSON de puntos con coordenadas redondeadas y propiedades mínimas en vez de PMTiles (evita instalar toolchain; GitHub Pages sirve gzip).
- Contratos intermedios fijados en `data/processed/` (GeoPackage en EPSG:25830) para que cada fuente se descargue en paralelo.
- Estaciones BiciMAD desde el feed GBFS oficial (madrid.publicbikesystem.net, station_information.json) — no requiere API key y trae coordenadas; se conservan las 678 estaciones (30 quedan fuera del término municipal, no se filtran aquí).
- Límites de distritos y barrios desde los shapefiles oficiales del Geoportal del Ayuntamiento de Madrid (sin fallback OSM) — descarga directa correcta, 21 y 131 registros en EPSG:25830.
- Se usa solo el GML `building` de Catastro (no buildingpart ni otherconstruction) — contiene currentUse y numberOfDwellings a nivel de edificio y pesa mucho menos.
- Se guarda como fecha de datos el `updated` del feed ATOM del dataset 28900 — el GML no trae fecha global fiable.
- uso nulo se conserva como nulo (no se imputa) — el filtrado se hace en fases posteriores.
- (SUPERADA por la decisión de 2025 más abajo) Población por sección tomada del Atlas de renta INE (tabla 31105, indicadores demográficos, año 2024) en lugar de padrón 2025 — INE no publica población 2025 por sección vía API; los 2.462 códigos coinciden al 100% con la cartografía 2025
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
- (SUPERADA: edificios.geojson eliminado, ahora edificios.pmtiles) edificios.geojson queda en 16,7 MB (4 decimales) — se acepta porque se carga solo al acercar el zoom y GitHub Pages lo sirve comprimido con gzip.
- Población 2025 desde el Censo anual de población 2025 por sección censal (INE, servicio ArcGIS de Esri España; 2.462 secciones, 3.477.497 hab.) — sustituye a la de 2024 (Atlas de renta); coincide 100 % con la cartografía 2025.
- Grupos de edad: 15–64 = suma de quinquenios 15–19…60–64; 65+ = 65–69…100 y más; se reparten a edificios con los mismos pesos y reglas que la población total.
- Edificios como PMTiles (MVT, capa `edificios`, z12–16) con huellas reales de Catastro, generado con mapbox-vector-tile + pmtiles en Python (sin tippecanoe); z12–13 simplificados (2 m / 1 m) y sin edificios <30 m².
- Clase de sombreado `k` de edificio = quintiles de población por edificio redondeados a enteros (cortes 3, 8, 22, 43), guardados en metadata.json.
- Ranking de estaciones (`pipeline/07_ranking_bases.py`): para cada estación se cuenta toda la población que vive a < 250 m y a 250–500 m andando de ella, aunque tenga otra más cercana (una persona puede contar en varias) — es la lectura literal de "vive a menos de X m de esta base"; la web ofrece además el recuento solo como base más cercana (`p250_cercana`, `p500_cercana`).
- 07 se ejecuta después de 06 porque 06 reescribe `bases.geojson` sin los campos del ranking — orden fijado en `run_all.py`.
- Se quita de la web el selector de grupo de población (15–64 / 65+) y se dejan de exportar los campos `a_*`/`m_*` — no aportaba (los porcentajes apenas difieren del total); siguen calculados en `data/processed/`.
