# Validacion de la ampliacion

Cobertura recalculada desde cero con Dijkstra multifuente (estaciones existentes + las k primeras nuevas, enganche exacto al nodo) y comparada con los totales registrados por el greedy (CELF).

| k nuevas | multifuente verde / amarillo / rojo | greedy verde / amarillo / rojo | dif. max (personas) |
|---:|---|---|---:|
| 0 | 1402658.12 / 1669124.01 / 405714.87 | 1402658.12 / 1669124.01 / 405714.87 | 0.0000 |
| 100 | 1828042.34 / 1467051.76 / 182402.89 | 1828042.34 / 1467051.76 / 182402.89 | 0.0000 |
| 1000 | 3294591.55 / 176262.74 / 6642.71 | 3294591.55 / 176262.74 / 6642.71 | 0.0000 |

- Diferencia maxima: **0.0000** personas.
- k = 0 frente a agregados.json: verde 1402658.1 vs 1402658, amarillo 1669124.0 vs 1669124, rojo 405714.9 vs 405715.
- Candidatos: 58623; pares candidato-edificio a <= 500 m: 6452908.
