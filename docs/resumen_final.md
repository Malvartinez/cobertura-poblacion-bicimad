# Resumen final del speedrun

- **Web:** https://malvartinez.github.io/cobertura-poblacion-bicimad/
- **Tiempo:** inicio 13:05, web desplegada 13:28 (≈ 23 min; ≈ 29 min desde la creación del plan a las 12:59).

## Resultado (ciudad de Madrid, 3.477.497 hab., Censo anual 2025)

| Nivel | Población | % | % 15–64 años | % 65+ años |
|---|---:|---:|---:|---:|
| Verde (< 250 m) | 1.178.044 | 33,9 % | 34,1 % | 34,5 % |
| Amarillo (250–500 m) | 1.801.946 | 51,8 % | 51,8 % | 51,9 % |
| Rojo (> 500 m) | 497.507 | 14,3 % | 14,1 % | 13,6 % |

Grupos: 15–64 años = 2.362.728 hab. (806.439 en verde); 65+ = 701.954 hab. (242.323 en verde).

## Validaciones

- Suma de población repartida = Censo 2025 (3.477.497, exacta, también para 15–64 y 65+); suma por distritos, barrios y secciones = ciudad.
- Distancias: 50/50 edificios de muestra coinciden con la ruta individual (NetworkX), error máximo ≈ 4e-16 (ver `validacion_distancias.md`).
- `edificios.pmtiles`: 22,9 MB, 1.645 teselas, z12–16, capa `edificios` (110.341 huellas Catastro); teselas z15 del centro de Madrid releídas y georreferenciadas correctamente.
- Polígonos ≈ 1,5 MB sin comprimir; cortes de sombreado por población de edificio: 3, 8, 22, 43.

## Decisiones principales (detalle en `decisiones.md`)

- Población por sección del Censo anual 2025 (INE, vía servicio ArcGIS de Esri España) con grupos 15–64 y 65+; cartografía de secciones 2025 (códigos 100 % coincidentes).
- Bases: feed GBFS de BiciMAD (678 bases, 30 fuera del municipio, mantenidas).
- Edificios como PMTiles generado en Python (mapbox-vector-tile + pmtiles), sin tippecanoe.
- Red OSM con etiquetas mínimas para ahorrar memoria (8 GB RAM); el primer intento murió en la construcción del grafo.

## Limitaciones conocidas

- 30 bases fuera del término (zona Pozuelo/Aravaca y bordes): revisar si son reales o pruebas del feed; afectan a la cobertura del borde oeste.
- 12 bases enganchadas a más de 150 m de la red; 1.973 edificios sin base a menos de 1.500 m (rojo).
- Las secciones sin población (parques, Retiro…) se pintan en rojo (0 % verde) en la coropleta.
- `run_all.py` no se ha ejecutado de principio a fin (los scripts sí, uno a uno).
