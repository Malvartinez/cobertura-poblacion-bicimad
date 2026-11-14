# Resumen final del speedrun

- **Web:** https://malvartinez.github.io/cobertura-poblacion-bicimad/
- **Tiempo:** inicio 13:05, web desplegada 13:28 (≈ 23 min; ≈ 29 min desde la creación del plan a las 12:59).

## Resultado (ciudad de Madrid, 3.414.246 hab.)

| Nivel | Población | % |
|---|---:|---:|
| Verde (< 250 m) | 1.157.655 | 33,9 % |
| Amarillo (250–500 m) | 1.770.193 | 51,8 % |
| Rojo (> 500 m) | 486.398 | 14,2 % |

## Validaciones

- Suma de población repartida = padrón (3.414.246, exacta); suma por distritos = ciudad; por barrios +1 por redondeo.
- Distancias: 50/50 edificios de muestra coinciden con la ruta individual (NetworkX), error máximo ≈ 4e-16 (ver `validacion_distancias.md`).
- Web probada en Edge headless: coropleta, bases, puntos de edificio a zoom 15, modal y pestaña Datos.
- Carga: polígonos ≈ 1,2 MB sin comprimir; `edificios.geojson` 16,7 MB → 1,1 MB con gzip, carga diferida a zoom ≥ 14.

## Decisiones principales (detalle en `decisiones.md`)

- Población por sección de 2024 (INE, Atlas de renta, tabla 31105): no se encontró la de 2025. Cartografía de secciones 2025 (códigos 100 % coincidentes).
- Bases: feed GBFS de BiciMAD (678 bases, 30 fuera del municipio, mantenidas).
- Edificios como GeoJSON en lugar de PMTiles (sin tippecanoe en Windows).
- Red OSM con etiquetas mínimas para ahorrar memoria (8 GB RAM); el primer intento murió en la construcción del grafo.

## Limitaciones conocidas

- Padrón 2024, no 2025 (revisar si datos.madrid.es publica 2025 por sección).
- 30 bases fuera del término (zona Pozuelo/Aravaca y bordes): revisar si son reales o pruebas del feed; afectan a la cobertura del borde oeste.
- 12 bases enganchadas a más de 150 m de la red; 1.973 edificios sin base a menos de 1.500 m (rojo).
- Las secciones sin población (parques, Retiro…) se pintan en rojo (0 % verde) en la coropleta.
- `run_all.py` no se ha ejecutado de principio a fin (los scripts sí, uno a uno).
