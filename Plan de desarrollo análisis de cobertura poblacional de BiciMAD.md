# Plan de desarrollo: análisis de cobertura poblacional de BiciMAD

Documento de planificación para Claude Code. Define objetivo, fuentes, método, arquitectura y fases del proyecto. Todo el cálculo se hace en Python; el resultado se publica como sitio estático en GitHub Pages.

## 0. Modo de trabajo: speedrun

Este proyecto es un ejercicio de velocidad: medir cuánto se tarda en tener la web publicada de principio a fin. Reglas para Claude Code:

- Trabajar de corrido, sin paradas de aprobación ni preguntas intermedias. No hay puntos de control humanos.
- Ante cualquier duda, tomar la decisión que mejor sirva para tener la web lista cuanto antes, y anotarla en una línea en `docs/decisiones.md` (qué se decidió y por qué).
- Funcionando antes que perfecto: una fuente que falla se sustituye por una alternativa equivalente; un paso costoso se simplifica; nunca se bloquea el avance.
- Al terminar, dejar la web desplegada y un resumen final con tiempo empleado, decisiones tomadas y limitaciones conocidas.

## 0.1 Reparto de modelos para ahorrar tokens

La barrera principal del speedrun es agotar el límite de la sesión antes de terminar. Por eso el trabajo se reparte entre modelos: el modelo principal (Opus) solo coordina y toma decisiones; lo ejecutable lo hacen subagentes con modelos más baratos. Reglas:

- **Opus (sesión principal)**: leer este plan, descomponer en tareas, lanzar subagentes, decidir ante dudas, revisar únicamente los resultados resumidos y resolver bloqueos. No escribe código ni lee ficheros grandes directamente.
- **Sonnet (subagentes de desarrollo)**: escribir y depurar los scripts del pipeline (fases 1 a 4), el código de la web (fase 5) y el despliegue (fase 6). Una tarea acotada por subagente, con instrucciones completas para que no necesite volver a preguntar.
- **Haiku (subagentes de apoyo)**: tareas mecánicas: descargar fuentes, comprobar que un fichero existe y tiene los campos esperados, ejecutar un script y devolver solo las últimas líneas del log, contar registros, generar README y textos de la landing, convertir formatos.
- Devolver a la sesión principal solo resúmenes cortos (recuentos, rutas de ficheros, errores), nunca volcados de datos ni logs completos.
- Ejecutar los scripts largos (descarga de OSM, Dijkstra, tippecanoe) en segundo plano o con salida redirigida a fichero, y leer solo el final.
- Usar `/compact` o equivalente entre fases para no arrastrar contexto, y evitar releer ficheros ya conocidos.
- Si en algún momento un subagente Sonnet falla dos veces en lo mismo, escalar a Opus esa tarea concreta, no el resto.

## 1. Objetivo

Calcular qué población de la ciudad de Madrid vive a menos de 250 m, entre 250 y 500 m, o a más de 500 m andando (por itinerarios peatonales reales) de la base de BiciMAD más cercana, y publicarlo en una web con mapa navegable y datos agregados por ciudad, distrito y barrio.

Ámbito: todo el municipio de Madrid, incluida la población fuera de la zona de actuación de BiciMAD. Situación actual, sin escenarios.

Niveles de cobertura:

- Verde (muy buena): < 250 m andando
- Amarillo (regular): 250–500 m
- Rojo (sin cobertura): > 500 m

## 2. Fuentes de datos

- **Bases de BiciMAD**: datos abiertos de EMT Madrid / datos.madrid.es (listado de estaciones con coordenadas). Guardar copia con fecha de descarga.
- **Población INE 2025**: Padrón por sección censal (Estadística del Padrón continuo / Censo anual, municipio 28079) y cartografía digitalizada de secciones censales del INE (shapefile, con códigos de distrito y sección).
- **Catastro Inspire 2025**: servicio ATOM de edificios (Buildings) del municipio de Madrid. Campos clave: geometría, `currentUse` (residencial), `numberOfDwellings`, `numberOfBuildingUnits`.
- **OpenStreetMap**: red peatonal descargada con OSMnx (`network_type="walk"`), con margen de \~1 km alrededor del municipio para no cortar itinerarios en el borde.
- **Límites de distritos y barrios**: datos.madrid.es (shapefiles oficiales del Ayuntamiento).

## 3. Método de cálculo

### 3.1 Preparación

1. Reproyectar todo a EPSG:25830 (UTM 30N) para medir en metros.
2. Filtrar edificios de Catastro con uso residencial y `numberOfDwellings > 0`. Calcular centroide de cada edificio.
3. Asignar cada edificio a una sección censal por el centroide (spatial join). Registrar los casos problemáticos: edificios cuyo centroide cae fuera de cualquier sección, y secciones con población pero sin edificios residenciales. Aplicar una regla sencilla sin consultar: edificio fuera de toda sección → asignar a la sección más cercana; sección con población y sin edificios residenciales → repartir entre sus edificios con viviendas de cualquier uso o, si no hay, en el centroide de la sección. Anotar los recuentos en \`docs/decisiones.md\`.

### 3.2 Reparto de población

Para cada sección censal, repartir su población entre sus edificios residenciales proporcionalmente al número de viviendas:

`pob_edificio = pob_sección × viviendas_edificio / viviendas_sección`

Comprobar que la suma por sección y por ciudad coincide con el padrón (tolerancia por redondeo).

### 3.3 Distancia andando a la base más cercana

Solo importa la base más cercana, así que no se calcula edificio × base. Procedimiento:

1. Construir el grafo peatonal con OSMnx y limpiarlo (componente principal, aristas con longitud en metros).
2. Enganchar cada base de BiciMAD al nodo más cercano del grafo (sumando la distancia de enganche).
3. Enganchar cada centroide de edificio a la arista peatonal más cercana; sumar la distancia perpendicular centroide–arista a la distancia por red.
4. Ejecutar un Dijkstra multiorigen desde todas las bases a la vez (todas con distancia inicial 0, o la de enganche) sobre el grafo. Esto da en una sola pasada la distancia de cada nodo a la base más cercana y cuál es esa base. Limitar la búsqueda a un corte de \~1.500 m; más allá, el edificio se clasifica directamente como rojo.
5. Asignar a cada edificio su distancia y su base más cercana, y el nivel (verde / amarillo / rojo).

Herramientas sugeridas: `osmnx`, `networkx` (o `scipy.sparse.csgraph.dijkstra` para rendimiento), `geopandas`, `shapely`, `pyogrio`.

### 3.4 Agregados

Calcular población y porcentaje por nivel para: toda la ciudad, cada distrito y cada barrio (y también por sección, para la coropleta). Guardar como JSON ligero.

## 4. Salidas precalculadas (carpeta `web/data/`)

- `edificios.pmtiles` (o GeoJSON troceado): puntos de edificio con población, distancia, nivel y base más cercana. Formato vector tiles con `tippecanoe` para que cargue rápido.
- `secciones.geojson` simplificado: coropleta con porcentaje de población por nivel.
- `distritos.geojson`, `barrios.geojson` simplificados, con agregados.
- `bases.geojson`: bases de BiciMAD.
- `agregados.json`: tablas de ciudad, distritos y barrios.
- `metadata.json`: fechas de descarga de cada fuente y parámetros (umbrales, corte).

## 5. Web (sitio estático)

Stack: HTML + JavaScript sin framework pesado (o Vite si se prefiere), MapLibre GL JS, PMTiles vía `pmtiles` protocol. Despliegue en GitHub Pages desde la carpeta `web/` con GitHub Actions.

### 5.1 Mapa

- Mapa base ligero (teselas vectoriales libres, por ejemplo OpenFreeMap o Protomaps).
- A escala ciudad: coropleta por sección censal (color según nivel dominante o porcentaje verde).
- Al acercar el zoom (≥ 14): puntos de edificio coloreados por nivel, tamaño según población.
- Capa de bases de BiciMAD siempre visible.
- Popup al pulsar un edificio: población estimada, distancia andando, base más cercana. Al pulsar una sección, distrito o barrio: resumen de población por nivel.
- Selector de capa (secciones / barrios / distritos) y leyenda.

### 5.2 Landing

Al entrar por primera vez, una ventana modal explicando qué muestra el mapa, los tres niveles, el método (en dos frases) y las fuentes. Botón «Explorar el mapa». Se recuerda con `localStorage` para no repetirla; enlace «Acerca de» para volver a verla.

### 5.3 Pestaña de datos agregados

Vista con: totales de la ciudad por nivel (población y porcentaje, gráfico de barras apiladas); tabla por distrito ordenable; tabla por barrio con buscador. Enlace para descargar `agregados.json` como CSV.

## 6. Estructura del repositorio

- `data/raw/`: descargas originales (no versionar los pesados; script de descarga reproducible).
- `data/processed/`: intermedios (parquet / GeoPackage).
- `pipeline/`: scripts Python numerados: `01_descarga.py`, `02_preparacion.py`, `03_reparto_poblacion.py`, `04_distancias.py`, `05_agregados.py`, `06_exportar_web.py`. Un `Makefile` o `run_all.py`.
- `web/`: sitio estático.
- `docs/`: \`decisiones.md\` (decisiones tomadas sin consultar, con una línea de justificación) y resumen final.
- `README.md`, `requirements.txt` o `pyproject.toml`.

## 7. Fases de trabajo

1. **Descarga y exploración**: scripts de descarga de las cinco fuentes; comprobar campos, sistemas de referencia y recuentos (número de bases, secciones, edificios residenciales, población total).
2. **Reparto de población**: implementar 3.1 y 3.2; aplicar las reglas de casos problemáticos y anotar los recuentos; seguir sin parar.
3. **Distancias**: implementar 3.3; validar con una muestra de edificios comparando contra un cálculo de ruta individual.
4. **Agregados y exportación**: 3.4 y 4.
5. **Web**: mapa, landing y pestaña de agregados; prueba de rendimiento de carga.
6. **Despliegue**: GitHub Pages con Actions; README con cómo reproducir el pipeline.

## 8. Validaciones y criterios de aceptación

- La suma de población repartida coincide con el padrón municipal.
- Las distancias de una muestra aleatoria de 50 edificios coinciden con rutas calculadas individualmente (tolerancia 5 %).
- El mapa carga en menos de 3 segundos en conexión normal y el zoom es fluido.
- Los agregados de la pestaña cuadran con los del mapa.

## 9. Decisiones ya tomadas (no reabrir)

- Umbrales 250 / 500 m andando, por red peatonal real.
- Solo cuenta la base más cercana; Dijkstra multiorigen.
- Punto de conexión del edificio: centroide enganchado a la arista más cercana.
- Ámbito: todo el municipio. Padrón INE 2025 y Catastro 2025.
- Sin escenarios; solo situación actual.
- Sitio estático con MapLibre en GitHub Pages; todo precalculado en Python.

## 10. Revisión posterior

- Nada bloquea el avance. Lo que haya quedado dudoso (edificios fuera de sección, secciones sin residencial, fuentes sustituidas) se revisa después con la web ya publicada, a partir de \`docs/decisiones.md\`.
