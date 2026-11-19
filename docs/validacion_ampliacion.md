# Validacion de la ampliacion

Cobertura recalculada desde cero con Dijkstra multifuente (estaciones existentes + las k primeras nuevas, enganche exacto al nodo) y comparada con los totales registrados por el greedy (CELF).

| k nuevas | multifuente verde / amarillo / rojo | greedy verde / amarillo / rojo | dif. max (personas) |
|---:|---|---|---:|
| 0 | 1533580.51 / 1589312.62 / 354603.87 | 1533580.51 / 1589312.62 / 354603.87 | 0.0000 |
| 100 | 1993517.00 / 1324759.93 / 159220.07 | 1993517.00 / 1324759.93 / 159220.07 | 0.0000 |
| 1000 | 3345219.34 / 127160.00 / 5117.66 | 3345219.34 / 127160.00 / 5117.66 | 0.0000 |

- Diferencia maxima: **0.0000** personas.
- k = 0 frente a agregados.json: verde 1533580.5 vs 1533581, amarillo 1589312.6 vs 1589313, rojo 354603.9 vs 354604.
- Candidatos: 58623; pares candidato-edificio a <= 500 m: 6446058.
