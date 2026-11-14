# Cobertura poblacional de BiciMAD

Calcula qué población de Madrid vive a menos de 250 m (verde), entre 250 y 500 m (amarillo) o a más de 500 m (rojo) andando de la base BiciMAD más cercana. Las distancias se miden sobre la red peatonal real, no en línea recta. Los resultados se publican en una web estática con mapa, rankings y un simulador de ampliación de la red.

Web: https://malvartinez.github.io/cobertura-poblacion-bicimad/

## Qué ofrece la web

- **Mapa**: coropleta por sección censal, barrio o distrito (% de población en verde); a partir de zoom 14, contornos reales de los edificios del Catastro coloreados por nivel y con tono más oscuro cuanta más población; bases de BiciMAD siempre visibles.
- **Zonas**: ranking visual de distritos y barrios (barras verde/amarillo/rojo), ordenable y con buscador; resalta y acerca la zona en el mapa.
- **Estaciones**: ranking de las 678 bases por población residente a < 250 m y a 250–500 m andando (opción de contar a cada persona solo en su base más cercana).
- **Ampliación**: deslizador de 0 a 1.000 estaciones nuevas, elegidas de forma secuencial (cada una la que más mejora la cobertura dadas las anteriores); muestra las estaciones en el mapa, recolorea los edificios, el reparto verde/amarillo/rojo de la ciudad y una curva de ganancia.
- **Tabla**: datos por distrito y barrio, con descarga en CSV.
- Tema oscuro/claro, diseño adaptado a móvil, vista del mapa compartible por URL.

## Fuentes

- **BiciMAD**: estaciones desde el feed GBFS oficial (`station_information.json`).
- **Límites de distritos y barrios**: Geoportal del Ayuntamiento de Madrid.
- **Población**: INE, Censo anual de población 2025 por sección censal (servicio ArcGIS de Esri España) y cartografía de secciones censales 2025 del INE.
- **Edificios**: Catastro, INSPIRE Buildings (uso residencial, número de viviendas y contorno).
- **Red peatonal**: OpenStreetMap vía OSMnx (`network_type="walk"`), con 1 km de margen alrededor del municipio.
- **Mapa base**: CARTO (dark-matter / positron).

## Método

1. Reparto de la población de cada sección censal entre sus edificios residenciales, proporcional al número de viviendas (la suma cuadra exactamente con el censo).
2. Cada edificio se engancha a la arista peatonal más cercana; cada base, al nodo más cercano.
3. Dijkstra multiorigen (scipy) desde todas las bases a la vez, con corte a 1.500 m: distancia de cada edificio a su base más cercana.
4. Agregados por ciudad, distrito, barrio y sección.
5. Ranking de estaciones: Dijkstra desde cada base (corte 500 m).
6. Ampliación: algoritmo voraz con evaluación perezosa (CELF) sobre ~58.500 candidatos (nodos de la red, uno por celda de 50 m), maximizando la mejora ponderada por persona (rojo→amarillo +1, amarillo→verde +1, rojo→verde +2).

Las validaciones (distancias frente a rutas individuales, ampliación recalculada desde cero) están en `docs/`.

## Cómo reproducir

```bash
pip install -r requirements.txt
python pipeline/run_all.py
```

`run_all.py` ejecuta en orden `01_descarga_*` (BiciMAD y límites, INE, Catastro, OSM), `02_preparacion`, `03_reparto_poblacion`, `04_distancias`, `05_agregados`, `06_exportar_web`, `07_ranking_bases` y `08_ampliacion`. La descarga de OSM y la generación de teselas tardan varios minutos; con 8 GB de RAM conviene cerrar otras aplicaciones. `07` debe ir después de `06` (que reescribe `bases.geojson`) y `08` regenera `edificios.pmtiles` con los campos de la ampliación.

Para ver la web en local hace falta un servidor que admita peticiones `Range` (las usa PMTiles); `python -m http.server` no las admite. Por ejemplo, con Node: `npx http-server web -p 8000` y abrir http://localhost:8000.

## Estructura del repositorio

```
data/raw/         descargas originales (no versionado)
data/processed/   capas intermedias en GeoPackage/Parquet, EPSG:25830 (no versionado)
pipeline/         scripts numerados del cálculo; _pmtiles.py genera las teselas vectoriales
web/              sitio estático (index.html, css/, js/, data/)
docs/             decisiones, validaciones y resumen del trabajo
```

## Despliegue

GitHub Actions (`.github/workflows/pages.yml`) publica el contenido de `web/` en GitHub Pages en cada push a `main` que toque `web/`.

## Limitaciones

- 30 bases del feed GBFS están fuera del término municipal (zona de Pozuelo/Aravaca y bordes); se mantienen y conviene revisarlas.
- 1.973 edificios no tienen ninguna base a menos de 1.500 m (se cuentan como rojo).
- La ampliación es un ejercicio de máxima cobertura residencial: no considera viabilidad del emplazamiento, demanda, topografía ni coste.
- Más detalle en `docs/decisiones.md` y `docs/resumen_final.md`.

## Licencia y atribución

- Datos de BiciMAD, Ayuntamiento de Madrid, INE y Catastro: citar la fuente y respetar sus condiciones de reutilización.
- Red peatonal: © colaboradores de OpenStreetMap, bajo licencia ODbL. Mapa base © CARTO.
