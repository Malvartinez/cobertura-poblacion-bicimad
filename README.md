# Cobertura poblacional de BiciMAD

Calcula qué población de Madrid vive a menos de 250 m, entre 250 y 500 m, o a más de 500 m andando de la base BiciMAD más cercana. Las distancias se miden sobre la red peatonal real, no en línea recta, y los resultados se agregan por ciudad, distrito y barrio para su consulta en un mapa navegable.

Web: https://malvartinez.github.io/cobertura-poblacion-bicimad/

## Fuentes

- **BiciMAD**: estaciones desde el feed GBFS oficial (`station_information.json`).
- **Límites de distritos y barrios**: Geoportal del Ayuntamiento de Madrid.
- **Población**: INE, secciones censales 2025 (cartografía) y población por sección 2024 (Atlas de distribución de renta de los hogares, tabla 31105).
- **Edificios**: Catastro, INSPIRE Buildings (uso residencial y número de viviendas).
- **Red peatonal**: OpenStreetMap vía OSMnx (`network_type="walk"`).

## Método

- Reparto de la población de cada sección censal entre sus edificios residenciales, proporcional al número de viviendas.
- Cada punto de edificio se engancha a la arista peatonal más cercana de la red.
- Distancias mínimas a todas las bases con Dijkstra multiorigen (scipy).
- Corte de búsqueda a 1.500 m desde cada base para acotar el cálculo; lo que queda fuera se clasifica como sin cobertura.
- Agregados de población por nivel de cobertura (verde < 250 m, amarillo 250–500 m, rojo > 500 m) para ciudad, distrito y barrio.

## Cómo reproducir

```bash
pip install -r requirements.txt
python pipeline/run_all.py
cd web
python -m http.server
```

Después, abrir http://localhost:8000 en el navegador.

## Estructura del repositorio

```
data/raw/         descargas originales (no versionado)
data/processed/   capas intermedias en GeoPackage, EPSG:25830 (no versionado)
pipeline/         scripts de descarga, preparación y cálculo
web/              sitio estático (mapa, HTML, CSS, JS)
docs/             decisiones tomadas durante el desarrollo
```

## Despliegue

GitHub Actions publica el contenido de `web/` en GitHub Pages en cada push a `main`.

## Limitaciones

- La población por sección es de 2024, no de 2025: el INE no publica la población 2025 por sección vía API. Ver `docs/decisiones.md`.
- Los edificios se sirven como GeoJSON de puntos en lugar de PMTiles, porque `tippecanoe` no está disponible en Windows.
- Solo se calcula la situación actual; no hay escenarios.

## Licencia y atribución

- Datos de BiciMAD, Ayuntamiento de Madrid, INE y Catastro: citar la fuente y respetar sus condiciones de reutilización.
- Red peatonal: © colaboradores de OpenStreetMap, bajo licencia ODbL.
