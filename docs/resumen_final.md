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

Recalculado el 2026-11-20 midiendo desde los portales del Catastro (ver `decisiones.md`), con estaciones, edificios y red peatonal descargados el 2026-11-19.

| Nivel | Población | % |
|---|---:|---:|
| Verde (< 250 m) | 1.402.658 | 40,3 % |
| Amarillo (250–500 m) | 1.669.124 | 48,0 % |
| Rojo (> 500 m) | 405.715 | 11,7 % |

Mejores distritos por % en verde: Centro (81,2 %), Arganzuela (72,4 %), Salamanca (60,1 %). Mayor % en rojo: Hortaleza (24,8 %), Moncloa-Aravaca (24,6 %), Moratalaz (23,2 %).

## Ranking de estaciones

Población que vive a menos de 250 m andando de cada estación (una persona puede contar en varias):

| Estación | Distrito | < 250 m | 250–500 m |
|---|---|---:|---:|
| 53 - Metro Lavapiés | Centro | 9.871 | 20.103 |
| 79 - Metro Menéndez Pelayo | Retiro | 7.907 | 16.739 |
| 178 - Junta Municipal Distrito Retiro | Retiro | 7.612 | 15.477 |
| 226 - Sierra Toledana - Camino de Valderribas | Puente de Vallecas | 7.435 | 15.902 |
| 175 - Jaime el Conquistador - Divino Vallés | Arganzuela | 7.020 | 16.076 |

Mediana: 2.095 personas a < 250 m por estación. 63 estaciones no tienen población residente a < 250 m (43 tampoco a < 500 m).

## Ampliación óptima

Selección secuencial de 1.000 estaciones nuevas (58.623 candidatos), maximizando la mejora ponderada por persona (rojo→amarillo +1, amarillo→verde +1, rojo→verde +2).

| Estaciones nuevas | Verde | Amarillo | Rojo |
|---:|---:|---:|---:|
| 0 | 40,3 % | 48,0 % | 11,7 % |
| 50 | 46,7 % | 46,3 % | 7,0 % |
| 100 | 52,6 % | 42,2 % | 5,2 % |
| 250 | 66,4 % | 31,2 % | 2,4 % |
| 500 | 81,2 % | 17,9 % | 0,9 % |
| 1.000 | 94,7 % | 5,1 % | 0,2 % |

Las cinco primeras: Usera · San Fermín (ganancia 14.122), Hortaleza · Valdefuentes (12.641), Villaverde · Ángeles (10.973), Fuencarral-El Pardo · Peñagrande (10.004), Villaverde · San Cristóbal (9.987).

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
