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

- Ampliación (pipeline/08_ampliacion.py): objetivo = mejora ponderada por persona (rojo→amarillo +1, amarillo→verde +1, rojo→verde +2) — premia tanto sacar a gente del rojo como llevarla a verde con un único número
- Candidatos = nodos de la red peatonal dentro del municipio, uno por celda de 50 m (el más cercano al centro) — con ~200 000 nodos el cálculo no es tractable y a 50 m la pérdida es mínima; la estación nueva se sitúa exactamente en su nodo
- Selección greedy con evaluación perezosa (CELF) — el objetivo es submodular, da exactamente la misma secuencia que el greedy simple evaluando muchos menos candidatos
- Máximo de 1000 nuevas estaciones — suficiente para ver el rendimiento decreciente; cada estación se calcula dado el conjunto ya elegido (existentes + nuevas anteriores)

## Web, despliegue y forma de trabajo

- Despliegue en un repositorio público nuevo (`Malvartinez/cobertura-poblacion-bicimad`) con GitHub Pages vía Actions publicando `web/` — lo pedía el plan; Pages gratuito requiere repositorio público.
- Primera versión de la web probada con Edge headless controlado por DevTools Protocol (script Node) — no había otro navegador automatizable; las capturas con `--screenshot` no esperan a que carguen las teselas.
- Mapa con `hash: true` — la vista (zoom y posición) queda en la URL y se puede compartir; también facilita las pruebas.
- Rediseño inspirado en busmadrid.org (estilo y disposición, no contenido ni marca): IBM Plex Sans, tema oscuro por defecto con conmutador a claro, tokens de color de su CSS, mapa base CARTO dark-matter/positron, panel lateral con pestañas y presentación inicial por pasos — petición del usuario.
- Secciones sin población se pintan transparentes en la coropleta — en rojo (0 % verde) dominaban visualmente el mapa (Monte de El Pardo, parques).
- Altas de fuentes y capas idempotentes (`addSrc`/`addLyr`) en cada `style.load` — al cambiar de tema rápidamente varios `setStyle` encadenados intentaban añadir capas duplicadas y dejaban el mapa a medias.
- Leyenda plegable en móvil (botón «Leyenda») — en 400 px tapaba media pantalla.
- Números siempre con separador de miles (`useGrouping: 'always'`) — por defecto es-ES no lo pone en cifras de 4 dígitos («8844» junto a «20.246» resultaba incoherente).
- Estaciones nuevas de la ampliación mostradas/ocultadas con opacidad (propiedad de pintado) en vez de `setFilter`; las etiquetas usan una fuente GeoJSON aparte — `setFilter` obliga a reprocesar la fuente en el worker, que quedaba en cola tras las teselas pesadas de edificios (z12) y las estaciones no llegaban a pintarse al mover el deslizador.
- En la pestaña Ampliación se ocultan las coropletas y los edificios se muestran desde zoom 12 con su nivel recalculado (`ka`/`kv`) — las coropletas no se recalculan por cada valor del deslizador.
- Para probar en local se usa un servidor estático propio con soporte `Range` — PMTiles lo necesita y `python -m http.server` no lo admite.
- Trabajo repartido en subagentes (Sonnet para desarrollo, Haiku para tareas mecánicas) coordinados desde la sesión principal, según el plan — ahorrar contexto y tokens.
- La sesión de Claude Code se cerró dos veces (≈17:00 y 17:44) y con ella murieron los subagentes en segundo plano; un `06_exportar_web.py` huérfano siguió ejecutándose y dejó temporalmente vacío `edificios.pmtiles` y sin campos `bases.geojson` — se esperó a que terminara, se relanzó `07`. Desde entonces `08_ampliacion.py` guarda resultados intermedios en disco (se reanuda si se corta) y `08` y el generador de teselas `_pmtiles.py` escriben de forma atómica (fichero temporal + `os.replace`); el resto de scripts no.

## Distancia desde el borde del edificio (2026-11-19)

- La distancia de cada edificio es la de su mejor punto de acceso: los dos extremos de la arista más cercana a su punto interior (como antes) o cualquier nodo de la red a ≤ 30 m de su huella, sumando la distancia del nodo al borde (`pipeline/_acceso.py`, usado por 04, 07 y 08) — mismo criterio que el proyecto BicinRivas (ADR-0126): en las manzanas grandes el punto interior se enganchaba a la calle de atrás y el método era claramente pesimista. Es algo optimista (supone que el portal da a la calle más favorable). Madrid pasa de 33,9 % a 44,1 % de población a menos de 250 m.
- Recalculo hecho con las capas intermedias (estaciones, edificios, población, límites y red peatonal descargados el 2026-11-19) del pipeline de [cobertura-bici-publica-espana](https://github.com/Malvartinez/cobertura-bici-publica-espana), que usa las mismas fuentes; la red peatonal procede allí del extracto OSM de download.openstreetmap.fr con el filtro `walk` de OSMnx, porque Overpass no era accesible desde el entorno de cálculo. Los pasos 04–08 de este repositorio se ejecutaron sobre esas capas y dan exactamente las mismas cifras que la versión nacional.
- `04_distancias.py` y `08_ampliacion.py` ya no añaden líneas a este fichero en cada ejecución (se duplicaban al relanzar).
