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

## Ranking de estaciones

Población que vive a menos de 250 m andando de cada estación (una persona puede contar en varias):

| Estación | Distrito | < 250 m | 250–500 m |
|---|---|---:|---:|
| 53 - Metro Lavapiés | Centro | 8.844 | 20.246 |
| 79 - Metro Menéndez Pelayo | Retiro | 7.413 | 14.404 |
| 418 - Puerto de Arlabán - San Diego | Puente de Vallecas | 6.419 | 14.928 |
| 226 - Sierra Toledana - Camino de Valderribas | Puente de Vallecas | 6.384 | 15.671 |
| 245 - Galileo - Donoso Cortés | Chamberí | 6.164 | 16.243 |

- Mediana: 1.665 personas a < 250 m por estación. 69 estaciones no tienen población residente a < 250 m (44 tampoco a < 500 m).
- Comprobaciones: la distancia mínima por estación coincide con la de 04 en los 88.176 edificios comparados (0 discrepancias); la población a < 250 m de alguna estación = 1.178.044 = total verde de la ciudad.


## Ampliación óptima

Selección secuencial (greedy) de 1000 nuevas estaciones que más mejoran la cobertura poblacional (58530 candidatos).

| Nuevas estaciones | Verde | Amarillo | Rojo |
|---:|---:|---:|---:|
| 0 | 33.9 % | 51.8 % | 14.3 % |
| 50 | 39.7 % | 51.2 % | 9.1 % |
| 100 | 45.1 % | 48.1 % | 6.8 % |
| 250 | 58.4 % | 38.0 % | 3.5 % |
| 500 | 73.8 % | 24.7 % | 1.5 % |
| 1000 | 90.2 % | 9.5 % | 0.3 % |

Las 5 primeras:

1. Usera · San Fermín — ganancia ponderada 13.795
2. Villaverde · Ángeles — ganancia ponderada 11.261
3. Hortaleza · Valdefuentes — ganancia ponderada 10.874
4. Carabanchel · Vista Alegre — ganancia ponderada 10.150
5. Villaverde · San Cristóbal — ganancia ponderada 9.924
