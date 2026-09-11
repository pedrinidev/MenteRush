# Diseño de juego — MenteRush

## 0. Dos formas de jugar

| | **Reto** | **Práctica** |
|---|---|---|
| Público | adolescentes y adultos | primaria |
| Vidas | 3, y game over | ninguna: fallar no castiga |
| Duración | hasta perder | sesión de 10 rondas |
| Velocidad | 1400 ms, acelerando | constante según el tramo |
| Números | 1..9 o dos cifras, con negativos opcionales | solo positivos de una cifra |

**Por qué existe el modo práctica.** El modo Reto no mide cálculo: mide memoria
de trabajo bajo presión. Hay que sostener un total mientras llegan números
nuevos, y esa capacidad todavía se está formando en primaria. Un niño puede saber
de sobra que 7 + 5 = 12 y aun así fracasar aquí — quedando con la idea de que se
le dan mal las matemáticas, cuando lo que falla es otra cosa.

Además, los números negativos no se ven en primaria: `-4` en pantalla es notación
de número negativo, no una resta.

| Tramo | Grados | Números | Tiempo por número | Rango |
|---|---|---|---|---|
| Inicial | 1º y 2º | 3 | 3000 ms | 1..5 |
| Medio | 3º y 4º | 4 | 2500 ms | 1..9 |
| Avanzado | 5º y 6º | 5 | 2000 ms | 1..9 |

La velocidad **no sube dentro de la sesión**: un ritmo estable deja al niño
encontrar su método. La progresión viene de cambiar de tramo, no de aguantar
una cuesta.

> Esto es razonamiento sobre cómo funciona el juego, no criterio pedagógico
> acreditado. Antes de usarlo en un aula conviene sentar a niños de distintos
> grados a jugarlo y ver dónde se atascan.

## 1. El bucle

Una partida es una sucesión de rondas. En cada ronda:

1. Un **respiro en negro** de 600 ms para colocarse.
2. Aparecen **N números uno a uno**, a pantalla completa (herencia de MentePro).
3. Termina la secuencia → tienes unos segundos para **teclear la suma**.
4. Aciertas → combo +1, la dificultad sube un escalón, ronda siguiente.
   Fallas o se acaba el tiempo → pierdes una vida y el combo se va a cero.

**El acierto se reconoce solo.** En cuanto lo tecleado coincide con el total, la
ronda se resuelve sin pulsar nada más: confirmar costaba una pulsación y, sobre
todo, tiempo del reloj. La tecla de confirmar sigue ahí, pero solo hace falta
para enviar una respuesta equivocada.

> Efecto secundario asumido: si el total es `7` y el jugador iba a teclear `75`,
> el `7` se acepta como acierto en cuanto se pulsa. Solo puede beneficiar al
> jugador, y evitar prefijos ambiguos exigiría un temporizador que devolvería
> justo la lentitud que se quería quitar.
4. Tres fallos → **game over**, con tu puntuación, tu mejor combo y tu récord.

La diferencia esencial con MentePro: **aquí se puede perder**. MentePro te
mostraba el resultado y tú te autoevaluabas; no había tensión. El fracaso, el
contador de vidas y el reloj son lo que convierten esto en algo que se rejuega.

## 2. Curva de dificultad

No hay selector de nivel. La dificultad es continua y depende de la ronda `r`.
Todas las fórmulas usan el progreso `p = r - 1`, para que la ronda 1 arranque
exactamente en los valores más suaves:

| Parámetro | Fórmula | Rango |
|---|---|---|
| Cantidad de números | `3 + floor(p / 3)` | 3 → 12 (8 en dos cifras) |
| Tiempo por número | base 3 rondas, luego −4% por ronda | 1400 → 320 ms |
| Tiempo para responder | base 3 rondas, luego −2.5% por ronda | 5000 → 2500 ms |

### Cómo sube la velocidad

Las **tres primeras rondas van a la velocidad base**, para entrar en calor. A
partir de la cuarta, cada ronda es un **4% más rápida que la anterior**.

Es un porcentaje y no una cantidad fija de milisegundos a propósito: restar 50 ms
a 1400 no se nota, pero restárselos a 400 es un frenazo. Quitar siempre el mismo
porcentaje se percibe igual de suave en toda la partida, y el mínimo se alcanza
asintóticamente, sin el escalón de quedarse plano de golpe.

| Ronda | Tiempo por número | Ventana de respuesta |
|---|---|---|
| 1-3 | 1400 ms | 5000 ms |
| 5 | 1290 ms | 4753 ms |
| 10 | 1052 ms | 4188 ms |
| 15 | 858 ms | 3690 ms |
| 20 | 699 ms | 3251 ms |
| 30 | 465 ms | 2524 ms |

La ventana de respuesta se estrecha más despacio (2.5%) que la velocidad: quedarse
sin tiempo para teclear agobia más que ver los números rápido.

### Tamaño de los números: una o dos cifras

Un segundo selector, independiente del modo:

| | Una cifra | Dos cifras |
|---|---|---|
| Positivos | 1..9 | 1..20 al empezar, hasta 1..99 |
| Negativos (Mixto) | -4..-1 | la mitad del techo: -10..-1 al empezar |
| Primer número | 5..9 | la mitad alta del techo: 10..20 al empezar |
| Números por ronda | hasta 12 | hasta 8 |
| Tiempo por número | 1400 → 320 ms | 1900 → 520 ms |
| Ventana de respuesta | 5000 → 2500 ms | 6500 → 3200 ms |

En dos cifras el techo **no arranca en 99**: las cuatro primeras rondas se juegan
con números de 1 a 20 —incluidos los de una cifra— y a partir de ahí sube 10 por
ronda hasta llegar a 99 en la ronda 12. Empezar directamente con números de 90 era
un muro desde el primer número, no una rampa.

| Ronda | Positivos | Negativos | Primer número |
|---|---|---|---|
| 1-4 | 1..20 | -10..-1 | 10..20 |
| 5 | 1..30 | -15..-1 | 15..30 |
| 8 | 1..60 | -30..-1 | 30..60 |
| 12+ | 1..99 | -49..-1 | 50..99 |

Las reglas son las mismas en ambos: primer número alto, suma parcial nunca
negativa y total de tres dígitos como mucho (8 × 99 = 792), así que el teclado no
cambia. Con dos cifras la ronda se corta antes y da más tiempo: cada número
cuesta mucho más de leer y acumular.

### Reglas del modo Mixto

- **El primer número es siempre positivo y alto (5..9)**: da colchón para que la
  suma no arranque cerca de cero.
- **Los negativos son suaves** (-4..-1, o -49..-10 con dos cifras): restar de
  cabeza cuesta bastante más que sumar, y la dificultad ya sube por cantidad y
  velocidad.
- **La suma parcial nunca baja de 0**, así que el total tampoco es nunca
  negativo. Por eso el teclado no tiene tecla de signo: no hace falta.

Valores implementados en `src/domain/difficulty.ts` y fijados por
`difficulty.test.ts`; ajustar el balance es tocar solo la constante `DIFFICULTY`.

Diseñado para que las 3-4 primeras rondas se ganen sin esfuerzo (arranque
gratificante) y la partida típica muera entre la ronda 12 y la 20.

Los modos **Suma** (solo positivos) y **Mixto** (con negativos) se conservan de
MentePro, se eligen antes de empezar y se persisten.

## 3. Puntuación

```
puntos = 10 × cantidadDeNúmeros × multiplicador × bonusVelocidad
```

- **multiplicador** = `1 + (combo - 1) × 0.5` desde el segundo acierto, tope **×5**
  (que se alcanza al noveno seguido): 2 → ×1.5, 3 → ×2, 4 → ×2.5, 5 → ×3…
- **bonusVelocidad** = `1 + (tiempoRestante / tiempoTotal) × 0.5` — responder
  rápido vale hasta un 50% más.

El multiplicador es la pieza central: perder un combo de 15 duele de verdad, y
ese dolor es exactamente lo que hace pulsar "otra vez".

## 4. Escalones de racha

Cada **2 aciertos** consecutivos se sube un escalón, y el escalón cambia **todo** a
la vez —color, sonido, intensidad— para que la subida se sienta física.

El escalón va a su propio ritmo porque **no puede seguir al multiplicador**: este
sube en cada acierto y escalones de color solo hay cinco. Así que el color cambia
cada dos aciertos y el `×` en todos.

En pantalla **el escalón no se muestra como tal**: el marcador dice `9 seguidos
×2.5` y nada más. El multiplicador ya cambia justo cuando cambia el escalón, así
que cualquier otro indicador (un número, estrellas, la palabra "tier") sería el
mismo dato repetido —y encima uno que no dice nada por sí solo, mientras que
"×2.5" informa de cuánto vale cada acierto.

En **Práctica el multiplicador se oculta** y queda solo `9 seguidos`: allí no hay
puntuación que optimizar y sería ruido.

Internamente el escalón se sigue llamando *tier* (`tierFor`), pero eso no sale
nunca a la interfaz.

| Escalón | Combo | × | Acento | Sonido | Efectos |
|---|---|---|---|---|---|
| 0 | 0-1 | ×1 | Azul frío | Tono base | Ninguno |
| 1 | 2-3 | ×1.5 y ×2 | Verde | +1 semitono | Pulso suave del fondo |
| 2 | 4-5 | ×2.5 y ×3 | Ámbar | +2 semitonos | Más estrellas al acertar |
| 3 | 6-7 | ×3.5 y ×4 | Magenta | +3 semitonos | Shake corto + estela en los números |
| 4 | 8+ | ×4.5 hasta ×5 | Rojo incandescente | +4 semitonos | Viñeta latiendo, lluvia densa de estrellas |

Medido en el juego, una racha limpia de nueve aciertos: +45, +67, +90, +150,
+180, +210, +300, +337, +374. El último vale **ocho veces** el primero.

El escalón se comunica también con el multiplicador, nunca solo con el color.

## 5. Game feel

Lo que separa "un ejercicio de aritmética" de un juego que engancha:

- **Aparición del número**: entra con escala 1.25 → 1.0 y un golpe de peso
  (cubic-bezier agresivo). El número es enorme: ocupa el ancho de la pantalla.
- **Acierto**: es una celebración, no un aviso. El ✓ entra dando un salto con un
  giro y se asienta, salen **estrellas de colores girando** desde el centro
  (paleta de fiesta mezclada con el color de la racha, para que la tiña sin
  monopolizarla), flash de pantalla, el marcador cuenta hacia arriba en vez de
  saltar y el tono asciende.
- **Fallo**: cámara lenta breve (~250 ms), la pantalla se desatura, tono grave,
  la vida perdida se rompe en el HUD, vibración en móvil.
- **Últimos 1500 ms para responder**: el borde de la pantalla late en rojo y el
  tic se acelera.
- **Récord superado**: se anuncia **en el momento**, en mitad de la partida, no
  al final.
- **Reinicio instantáneo**: en game over, `Espacio` o `Enter` reinicia sin menús
  ni transiciones largas. El hueco entre morir y volver a jugar debe ser < 1 s;
  es el factor que más determina cuántas partidas seguidas se juegan.

## 6. Entrada

- **Escritorio**: teclado numérico directo, `Enter` confirma, `Backspace` borra.
  Nunca hay que tocar el ratón durante una partida.
- **Móvil**: teclado numérico propio, grande, en la mitad inferior. No se usa el
  teclado nativo del sistema (tarda en abrirse, tapa la pantalla y rompe el ritmo).
- No hay tecla de signo: el total nunca es negativo.

## 7. Fuera de alcance (por ahora)

Ranking online, cuentas, reto diario, logros y dificultad adaptativa quedan
fuera de esta primera versión por decisión explícita. La arquitectura los
admite después sin reescribir el dominio.
