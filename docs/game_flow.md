# Flujo de pantallas — MenteRush

Equivalente web de `mobile_flow.md` de MentePro. Aquí no hay Activities ni
Intents: es una SPA con tres vistas y una máquina de estados.

```
┌──────────────────┐   JUGAR / Espacio    ┌──────────────────────────────┐
│ HomeScreen       │ ───────────────────▶ │ GameScreen                   │
│                  │                      │                              │
│ - Suma / Mixto   │ ◀──── Escape ─────── │  countdown  3·2·1            │
│ - Récord, mejor  │                      │  showing    números uno a uno│
│   combo, partidas│                      │  answering  teclado + reloj  │
│ - Sonido on/off  │                      │  feedback   acierto / fallo  │
└──────────────────┘                      └──────────────┬───────────────┘
        ▲                                                │ 0 vidas
        │ INICIO                                         ▼
        │                                 ┌──────────────────────────────┐
        └──────────────────────────────── │ GameOverScreen               │
                                          │ - Puntuación y mejor combo   │
                                          │ - ¿Récord? → celebración     │
                                          │ - OTRA VEZ (Espacio/Enter)   │
                                          └──────────────┬───────────────┘
                                                         │ OTRA VEZ
                                                         └──▶ GameScreen
```

`GameOverScreen → GameScreen` es directo, sin pasar por el menú: es el camino
crítico del juego y debe ser instantáneo.

## Máquina de estados (`domain/gameMachine.ts`)

| Estado | Qué pasa | Salida |
|---|---|---|
| `idle` | Menú, nada corriendo | `START` → `countdown` |
| `countdown` | 3·2·1 antes de la primera ronda | fin → `showing` |
| `showing` | Respiro inicial de 600 ms, luego cada número durante `delayMs`, y una pausa final en negro de 250 ms | fin de la pausa → `answering` |
| `answering` | Entrada del jugador contra reloj. Al coincidir con el total se envía sola | `SUBMIT` → `feedback`; rebasar `answerMs` → `feedback` (timeout) |
| `feedback` | Resuelve acierto o fallo, actualiza combo y vidas | vidas > 0 → `showing`, si no → `gameOver` |
| `gameOver` | Resultado final, persiste estadísticas | `RESTART` → `countdown`, `HOME` → `idle` |

Transiciones disparadas por: `START(mode, record)`, `TICK(deltaMs)`,
`SUBMIT(valor)`, `RESTART` y `HOME`.

**No existe una acción `TIMEOUT`.** Agotar la ventana de respuesta es
simplemente el `TICK` que rebasa `answerMs`; así UI y dominio no pueden
discrepar sobre cuándo se acabó el tiempo. El avance del tiempo entra siempre
como `TICK` y el dominio nunca consulta un reloj real, de modo que una partida
entera se simula en un test sin esperar un milisegundo.

Un `TICK` grande (pestaña en segundo plano, frame perdido) no se salta fases: el
sobrante se arrastra como tiempo inicial de la fase siguiente. Las acciones
inválidas para la fase actual se ignoran devolviendo el mismo estado.

Duraciones en `TIMING` y vidas en `INITIAL_LIVES` (`src/domain/gameMachine.ts`).

## Datos que cruzan pantallas

No hay Intents; el estado vive en el reducer y baja por props:

- `HomeScreen → GameScreen`: `mode` (SUMA | MIXTO), leído de `settingsRepository`.
- `GameScreen → GameOverScreen`: `score`, `bestCombo`, `roundsCleared`,
  `isNewRecord`.
- `GameOverScreen → statsRepository`: se persisten récord, mejor combo, partidas
  jugadas y precisión acumulada.

## Tiempos

| Momento | Duración |
|---|---|
| Cuenta atrás inicial | 3 × 700 ms |
| Respiro en negro al empezar cada ronda | 600 ms |
| Cada número en pantalla | `delayMs(r)` — 1400 → 320 ms |
| Pausa antes de pedir respuesta | 250 ms |
| Ventana de respuesta | `answerMs(r)` — 5000 → 2500 ms |
| Feedback de acierto | 450 ms |
| Feedback de fallo | 900 ms (incluye la cámara lenta) |
| Game over → nueva partida | < 1000 ms |
