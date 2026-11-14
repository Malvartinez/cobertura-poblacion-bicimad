# Validacion de la ampliacion

Cobertura recalculada desde cero con Dijkstra multifuente (estaciones existentes + las k primeras nuevas, enganche exacto al nodo) y comparada con los totales registrados por el greedy (CELF).

| k nuevas | multifuente verde / amarillo / rojo | greedy verde / amarillo / rojo | dif. max (personas) |
|---:|---|---|---:|
| 0 | 1178043.73 / 1801945.87 / 497507.40 | 1178043.73 / 1801945.87 / 497507.40 | 0.0000 |
| 100 | 1567964.17 / 1672477.72 / 237055.11 | 1567964.17 / 1672477.72 / 237055.11 | 0.0000 |
| 1000 | 3136538.07 / 329246.67 / 11712.26 | 3136538.07 / 329246.67 / 11712.26 | 0.0000 |

- Diferencia maxima: **0.0000** personas.
- k = 0 frente a agregados.json: verde 1178043.7 vs 1178044, amarillo 1801945.9 vs 1801946, rojo 497507.4 vs 497507.
- Candidatos: 58530; pares candidato-edificio a <= 500 m: 6465321.
