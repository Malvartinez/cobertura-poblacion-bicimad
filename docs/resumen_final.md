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

| Nivel | Población | % |
|---|---:|---:|
| Verde (< 250 m) | 1.178.044 | 33,9 % |
| Amarillo (250–500 m) | 1.801.946 | 51,8 % |
| Rojo (> 500 m) | 497.507 | 14,3 % |

Por edades (calculado, ya no se muestra en la web): 15–64 años 34,1 % / 51,8 % / 14,1 %; 65+ años 34,5 % / 51,9 % / 13,6 %.

Mejores distritos por % en verde: Centro (76,8 %), Arganzuela (58,0 %), Salamanca (53,8 %). Mayor % en rojo: Moratalaz (30,8 %), Hortaleza (29,6 %), Moncloa-Aravaca (28,0 %).

## Ranking de estaciones

Población que vive a menos de 250 m andando de cada estación (una persona puede contar en varias):

| Estación | Distrito | < 250 m | 250–500 m |
|---|---|---:|---:|
| 53 - Metro Lavapiés | Centro | 8.844 | 20.246 |
| 79 - Metro Menéndez Pelayo | Retiro | 7.413 | 14.404 |
| 418 - Puerto de Arlabán - San Diego | Puente de Vallecas | 6.419 | 14.928 |
| 226 - Sierra Toledana - Camino de Valderribas | Puente de Vallecas | 6.384 | 15.671 |
| 245 - Galileo - Donoso Cortés | Chamberí | 6.164 | 16.243 |

Mediana: 1.665 personas a < 250 m por estación. 69 estaciones no tienen población residente a < 250 m (44 tampoco a < 500 m).

## Ampliación óptima

Selección secuencial de 1.000 estaciones nuevas (58.530 candidatos), maximizando la mejora ponderada por persona (rojo→amarillo +1, amarillo→verde +1, rojo→verde +2).

| Estaciones nuevas | Verde | Amarillo | Rojo |
|---:|---:|---:|---:|
| 0 | 33,9 % | 51,8 % | 14,3 % |
| 50 | 39,7 % | 51,2 % | 9,1 % |
| 100 | 45,1 % | 48,1 % | 6,8 % |
| 250 | 58,4 % | 38,0 % | 3,5 % |
| 500 | 73,8 % | 24,7 % | 1,5 % |
| 1.000 | 90,2 % | 9,5 % | 0,3 % |

Las cinco primeras: Usera · San Fermín (ganancia 13.795), Villaverde · Ángeles (11.261), Hortaleza · Valdefuentes (10.874), Carabanchel · Vista Alegre (10.150), Villaverde · San Cristóbal (9.924).

## Validaciones

- Reparto: la suma por edificios coincide exactamente con el censo (3.477.497), también por sección, barrio y distrito.
- Distancias: 50/50 edificios de muestra coinciden con la ruta calculada individualmente (`validacion_distancias.md`).
- Ranking de estaciones: la distancia mínima por estación coincide con la de `04` en los 88.176 edificios comparados; la población a < 250 m de alguna estación = total en verde.
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
- 12 bases enganchadas a más de 150 m de la red; 1.973 edificios sin base a menos de 1.500 m (rojo).
- La ampliación solo maximiza cobertura residencial: no tiene en cuenta viabilidad del emplazamiento, demanda, pendientes ni coste. Los candidatos se agrupan en celdas de 50 m.
- En la pestaña Ampliación los edificios recalculados solo se ven desde zoom 12 y las coropletas se ocultan; en móvil el deslizador queda bajo en el panel inferior. No se ha probado esa pestaña en tema claro ni en móvil.
- Las teselas de edificios a zoom 12 pesan hasta 640 KB cada una; en equipos lentos la vista de ciudad de la Ampliación puede tardar en pintar los edificios.
- `run_all.py` no se ha ejecutado nunca de principio a fin (los scripts sí, uno a uno).
- `04_distancias.py` añade sus líneas a `decisiones.md` en cada ejecución, por lo que se duplican si se vuelve a ejecutar.
- Tras cada despliegue, la caché de GitHub Pages puede servir la versión anterior durante unos 10 minutos.
