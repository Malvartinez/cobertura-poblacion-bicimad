# Resumen del trabajo

- **Web:** https://malvartinez.github.io/cobertura-poblacion-bicimad/
- **Repositorio:** https://github.com/Malvartinez/cobertura-poblacion-bicimad
- **Fecha:** 14 de noviembre de 2026.

## Cronología

| Hora | Hito |
|---|---|
| 12:59 | Plan de desarrollo creado. |
| 13:05 | Inicio del speedrun: cuatro subagentes descargan en paralelo BiciMAD + límites, INE, Catastro y OSM; otro construye la web con datos de prueba. |
| 13:28 | **Primera web desplegada (≈ 23 min).** Población 2024, edificios como puntos GeoJSON, coropleta por sección/barrio/distrito, pestaña de datos. |
| 14:18 | Población del Censo anual 2025; contornos reales de edificios en PMTiles con tono según población; rediseño inspirado en busmadrid.org con ranking visual de distritos y barrios. |
| 14:22 | Correcciones: secciones sin población transparentes, cambio de tema robusto, leyenda plegable en móvil. |
| 17:55 | Ranking de estaciones por población a < 250 m y 250–500 m; se quita el selector de grupo de edad. (La sesión se cortó dos veces durante esta fase; ver `decisiones.md`.) |
| 19:43 | Sección Ampliación: 1.000 estaciones nuevas elegidas de forma secuencial, con deslizador, curva de ganancia y edificios recalculados. |

## Resultado actual (Madrid, 3.477.497 hab., Censo anual 2025)

Recalculado el 2026-11-19 midiendo desde el borde de cada edificio (ver `decisiones.md`), con estaciones, edificios y red peatonal descargados ese día.

| Nivel | Población | % |
|---|---:|---:|
| Verde (< 250 m) | 1.533.581 | 44,1 % |
| Amarillo (250–500 m) | 1.589.313 | 45,7 % |
| Rojo (> 500 m) | 354.604 | 10,2 % |

Por edades (calculado, ya no se muestra en la web): 15–64 años 44,3 % / 45,6 % / 10,0 %; 65+ años 44,6 % / 45,6 % / 9,7 %.

Mejores distritos por % en verde: Centro (82,9 %), Arganzuela (75,5 %), Salamanca (62,2 %). Mayor % en rojo: Moncloa-Aravaca (23,4 %), Hortaleza (21,4 %), Moratalaz (20,6 %).

## Ranking de estaciones

Población que vive a menos de 250 m andando de cada estación (una persona puede contar en varias):

| Estación | Distrito | < 250 m | 250–500 m |
|---|---|---:|---:|
| 53 - Metro Lavapiés | Centro | 10.083 | 20.383 |
| 79 - Metro Menéndez Pelayo | Retiro | 8.439 | 16.635 |
| 475 - Aurora Boreal - Minerva | Vicálvaro | 8.384 | 8.072 |
| 226 - Sierra Toledana - Camino de Valderribas | Puente de Vallecas | 8.026 | 16.873 |
| 163 - Metro Acacias | Arganzuela | 7.272 | 12.686 |

Mediana: 2.429 personas a < 250 m por estación. 60 estaciones no tienen población residente a < 250 m (43 tampoco a < 500 m).

## Ampliación óptima

Selección secuencial de 1.000 estaciones nuevas (58.623 candidatos), maximizando la mejora ponderada por persona (rojo→amarillo +1, amarillo→verde +1, rojo→verde +2).

| Estaciones nuevas | Verde | Amarillo | Rojo |
|---:|---:|---:|---:|
| 0 | 44,1 % | 45,7 % | 10,2 % |
| 50 | 51,2 % | 42,6 % | 6,1 % |
| 100 | 57,3 % | 38,1 % | 4,6 % |
| 250 | 71,1 % | 27,0 % | 2,0 % |
| 500 | 85,1 % | 14,0 % | 0,9 % |
| 1.000 | 96,2 % | 3,7 % | 0,1 % |

Las cinco primeras: Usera · San Fermín (ganancia 14.417), Hortaleza · Valdefuentes (12.340), Villaverde · San Cristóbal (10.694), Puente de Vallecas · Palomeras Bajas (10.175), Villaverde · Ángeles (10.066).

## Validaciones

- Reparto: la suma por edificios coincide exactamente con el censo (3.477.497), también por sección, barrio y distrito.
- Distancias: 50/50 edificios de muestra coinciden con la ruta calculada individualmente (`validacion_distancias.md`).
- Ranking de estaciones: la distancia mínima por estación coincide con la de `04` en los 90.465 edificios comparados; la población a < 250 m de alguna estación = total en verde.
- Ampliación: la cobertura recalculada desde cero con 0, 100 y 1.000 estaciones nuevas coincide exactamente con la del algoritmo (`validacion_ampliacion.md`).
- Web: revisada con capturas de Edge headless (tema oscuro y claro, escritorio y 400 px).

## Datos publicados (`web/data/`)

- `edificios.pmtiles` (≈ 23 MB, z12–16): contornos con población `p`, distancia `d`, nivel `n`, base `b`, clase de población `k` y pasos de ampliación `ka`/`kv`.
- `secciones.geojson`, `barrios.geojson`, `distritos.geojson`, `agregados.json`: agregados por nivel.
- `bases.geojson`: bases con `p250`, `p500` y sus versiones `_cercana`.
- `ampliacion_estaciones.geojson`, `ampliacion_curva.json`: resultado de la ampliación.
- `metadata.json`: fuentes, parámetros y cortes de población.

## Limitaciones y pendientes

- 30 bases del feed GBFS fuera del término municipal (zona de Pozuelo/Aravaca y bordes): revisar si son reales; afectan a la cobertura del borde oeste.
- 12 bases enganchadas a más de 150 m de la red; 1.943 edificios sin base a menos de 1.500 m (rojo).
- La ampliación solo maximiza cobertura residencial: no tiene en cuenta viabilidad del emplazamiento, demanda, pendientes ni coste. Los candidatos se agrupan en celdas de 50 m.
- En la pestaña Ampliación los edificios recalculados solo se ven desde zoom 12 y las coropletas se ocultan; en móvil el deslizador queda bajo en el panel inferior. No se ha probado esa pestaña en tema claro ni en móvil.
- Las teselas de edificios a zoom 12 pesan hasta 640 KB cada una; en equipos lentos la vista de ciudad de la Ampliación puede tardar en pintar los edificios.
- `run_all.py` no se ha ejecutado nunca de principio a fin (los scripts sí, uno a uno).
- `04_distancias.py` añade sus líneas a `decisiones.md` en cada ejecución, por lo que se duplican si se vuelve a ejecutar.
- Tras cada despliegue, la caché de GitHub Pages puede servir la versión anterior durante unos 10 minutos.
