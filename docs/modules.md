# Módulos — MenteRush

```
src/
├── domain/          TypeScript puro · sin React · sin DOM
├── application/     Hooks (el "ViewModel")
├── data/            Persistencia (localStorage)
├── ui/              Componentes React
└── styles/          Tokens y temas
```

## `domain/` — reglas del juego

✅ **Implementado y verificado** (46 tests en verde, `npm test`).

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | `OperationMode`, `DigitMode`, `PlayMode`, `SchoolLevel`, `GameStatus`, `AnswerOutcome`, `ValueRange`, `RoundConfig`, `GameState`, `Action`. |
| `random.ts` | `RandomSource` inyectable y `createSeededRandom` (mulberry32). Hace deterministas los tests y deja la puerta abierta a sembrar por fecha. |
| `difficulty.ts` (práctica) | `PRACTICE` y `configForPractice(level)`: la tabla del modo escolar, sin aceleración ni negativos. |
| `difficulty.ts` | Curva continua: `configForRound(r, mode, digits) → RoundConfig`, con la velocidad decayendo exponencialmente hacia su mínimo. Única fuente de verdad del balance, en la constante `DIFFICULTY`. Sustituye a `GameConfig.kt`. |
| `numberGenerator.ts` | `generateRound(config, random)`: sin 0, sin repetir el anterior, primer número dentro de `firstRange` y suma parcial nunca negativa (por eso el total tampoco lo es). |
| `round.ts` | `GameRound { numbers, total }` y `createRound`. |
| `scoring.ts` | `multiplierFor`, `speedBonus`, `tierFor`, `pointsFor`. Constantes en `SCORING`. |
| `gameMachine.ts` | Reducer puro `(state, action) => state` con `TIMING` e `INITIAL_LIVES`. Todas las transiciones del juego. |
| `index.ts` | Superficie pública del dominio; el resto de capas importan de aquí. |

Ninguno de estos archivos importa React, `window`, `localStorage` ni `Date`.

## `application/` — orquestación

| Archivo | Responsabilidad |
|---|---|
| `useGameEngine.ts` | Une reducer + reloj + persistencia. Expone el estado y las acciones a la UI. Único punto que conoce las cuatro capas. |
| `useCountdown.ts` | Bucle de tiempo con `requestAnimationFrame`; emite `TICK`. No conoce las reglas. |
| `useAudio.ts` | Web Audio API: tonos sintetizados cuyo pitch sube con el tier. Respeta el ajuste de sonido. |
| `useHaptics.ts` | `navigator.vibrate` en móvil; no-op donde no exista. |
| `useTheme.ts` | Resuelve la preferencia de tema (`auto`/`light`/`dark`) y la aplica al documento. Con `auto` no escribe atributo: manda `prefers-color-scheme`, y escucha sus cambios. |
| `useKeypad.ts` | Entrada unificada de teclado físico y teclado en pantalla. Envía sola la respuesta cuando coincide con `autoSubmitValue` (el total correcto). Sin manejo de signo. |

## `data/` — persistencia

| Archivo | Responsabilidad |
|---|---|
| `statsRepository.ts` | Récord, mejor combo, partidas y precisión **separados por modo de juego** (`StatsByMode`): mezclar los récords de Práctica con los de Reto haría que ninguno significara nada. Migra el bloque único de la v1 a las de Reto. |
| `settingsRepository.ts` | Modo (Suma/Mixto), sonido, vibración y tema. Equivale a `SharedPreferences("operacion")` de MentePro. |
| `storageKeys.ts` | Claves versionadas (`menterush.v2.stats`) para poder migrar sin romper datos; conserva la clave v1 para el rescate. |

Ambos repositorios están detrás de una interfaz: cambiarlos por una API remota
más adelante no toca ni el dominio ni la UI. Toda lectura valida la forma del
dato y cae a un valor por defecto si está corrupto.

## `ui/` — presentación

### `screens/`
| Archivo | Responsabilidad |
|---|---|
| `HomeScreen.tsx` | Selectores Suma/Mixto y 1/2 cifras, récord, ajustes, botón JUGAR, cambio de tema y enlace de descarga a MentePro en Google Play. |
| `GameScreen.tsx` | Orquesta las fases visuales: cuenta atrás, número, teclado, feedback. |
| `GameOverScreen.tsx` | Resultado, celebración de récord, reinicio instantáneo. |

### `components/`
| Archivo | Responsabilidad |
|---|---|
| `BigNumber.tsx` | El número a pantalla completa con su animación de entrada. El tamaño se calcula para llenar ~85% del ancho sea cual sea la longitud, con tope en `vh` para el apaisado (cada cifra ocupa ~0.8 de su tamaño de fuente, medido en pantalla). |
| `BigNumber.tsx` (tamaño) | El tamaño sale de una fórmula, no de una tabla: cuenta las cifras y el signo (más estrecho) para que todo número llene ~84% del ancho. |
| `ThemeToggle.tsx` | Cambio claro/oscuro, fijo en la esquina superior derecha. Solo en el menú y en la pantalla final: durante la partida distraería. |
| `AnswerDisplay.tsx` | Lo tecleado hasta ahora, con cursor parpadeante. |
| `Keypad.tsx` | Teclado numérico grande (móvil) y espejo del teclado físico. |
| `TimerBar.tsx` | Barra de tiempo de respuesta; late en rojo bajo 1500 ms. |
| `ComboMeter.tsx` | Racha y multiplicador, en los dos modos. |
| `LivesIndicator.tsx` | Las 3 vidas como corazones (♥ lleno / ♡ hueco), con la animación de rotura al perder una. |
| `ScoreCounter.tsx` | Puntuación que cuenta hacia arriba en vez de saltar. |

Los estilos van en dos hojas CSS Modules compartidas — `components.module.css`
y `screens.module.css` — en lugar de una por componente: son piezas pequeñas de
un mismo sistema visual y repartirlas en diez ficheros solo añadía saltos.

### `effects/`
| Archivo | Responsabilidad |
|---|---|
| `ParticleCanvas.tsx` | Estrellas de colores girando, en canvas 2D; el bucle se detiene por completo cuando no queda ninguna viva. El lienzo está acotado a ~2.5 M píxeles (~10 MB) para no reservar 56 MB en monitores grandes. Tolera que falten `canvas` o `matchMedia`. |
| `ScreenFlash.tsx` | Flash del color del tier al acertar, rojo al fallar, y `ComboVignette` para los tiers altos. |
| `effects.module.css` | Shake, cámara lenta (`slowmo`) y viñeta. El shake se anula con `prefers-reduced-motion`. |

El color de las partículas se lee del CSS con `getComputedStyle`, no de una tabla
duplicada en JavaScript: la paleta de tiers vive solo en `tiers.css`.

Los componentes son presentacionales: reciben props, emiten eventos, no calculan
reglas ni leen persistencia.

## `styles/`

| Archivo | Responsabilidad |
|---|---|
| `tokens.css` | Colores, espaciados, tipografía, curvas de animación. |
| `tiers.css` | Los cinco acentos de combo como variables CSS conmutables. |

## Tests (`src/domain/__tests__/`)

Vitest, mismo rol que los 16 tests JVM de MentePro. **46 tests, todos en verde:**

- `numberGenerator.test.ts` (8) — cantidad, sin 0, sin consecutivos iguales, dentro
  de rango, total = suma, determinismo con RNG fijo.
- `difficulty.test.ts` (7) — fija la curva: valores en r=1, valores en el tope,
  monotonía, respeto de los límites.
- `scoring.test.ts` (11) — multiplicador por combo, tope ×5, bonus de velocidad, tiers.
- `gameMachine.test.ts` (20) — partida completa simulada con `TICK`: arranque,
  avance de la secuencia, acierto, bonus por rapidez, fallo, timeout, pérdida de
  vidas, game over, reinicio, récord marcado en vivo y robustez ante ticks
  enormes o acciones fuera de fase.

## Tests de integración (`src/ui/__tests__/app.test.tsx`)

12 tests sobre un DOM real (jsdom) con el reloj y `requestAnimationFrame`
falseados. Comprueban lo que los tests de dominio no pueden: que las capas están
bien conectadas y que una partida se juega entera desde la interfaz — menú,
secuencia, respuesta con teclado en pantalla y físico, fallo, timeout, game over
con persistencia, y el modo recordado entre sesiones.

## Estado de la implementación

| Capa | Estado |
|---|---|
| `domain/` | ✅ Completa · 79 tests |
| `data/` | ✅ Completa · 15 tests |
| `application/` | ✅ Completa |
| `ui/` | ✅ Completa · 12 tests de integración |
| PWA | ✅ Manifest + service worker (solo en producción) |

**105 tests en verde**, `tsc --noEmit` limpio y build de producción en 54 kB gzip.
