# Arquitectura — MenteRush

Juego web de cálculo mental. Heredero directo de **MentePro** (Android/Kotlin),
reconstruido para navegador con un bucle de juego competitivo y feedback sensorial
intenso.

> Nombre de trabajo: **MenteRush**. Cambiarlo solo afecta a `package.json`,
> el `<title>` y este directorio.

## 1. Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Alcance | Un solo juego, muy pulido | Más profundidad y calidad que una suite dispersa |
| Backend | **Ninguno** | Cero infraestructura; el dominio queda listo para añadirlo después |
| Persistencia | `localStorage` | Récords y preferencias por dispositivo |
| Enganche | Combos, rachas y feedback intenso | Es lo que diferencia esto de MentePro |

No hay API remota ni base de datos, por lo que **no existen `api.md` ni
`database.md`** (misma justificación que en MentePro). El contrato de persistencia
está descrito en `modules.md`, sección `data/`.

## 2. Stack

- **Vite + React 18 + TypeScript** (`strict: true`).
- **Vitest** para los tests del dominio (mismo rol que los tests JVM de MentePro).
- **CSS Modules** + variables CSS para el sistema de temas y los tiers de combo,
  agrupados en dos hojas (`components.module.css`, `screens.module.css`).
- **Tema claro y oscuro** por tokens: `tokens.css` define ambos y `tiers.css`
  duplica los cinco acentos, porque los tonos que brillan sobre negro pierden
  contraste sobre blanco. Sin elección del jugador se sigue a
  `prefers-color-scheme`; al pulsar el cambio se fija en `data-theme` y se
  persiste.
- **jsdom + Testing Library** para los tests de integración de la interfaz.
- **Web Audio API** sintetizando los tonos en runtime: cero archivos de audio,
  cero peso, y el tono puede subir con el combo (imposible con samples fijos).
- **Canvas 2D** solo para las partículas; el resto de efectos son CSS/WAAPI.
- **PWA** (manifest + service worker): instalable y jugable sin conexión.

Sin librería de estado externa (`useReducer` basta) y sin librería de animación:
la única dependencia de runtime es React.

## 3. Capas

```
┌───────────────────────────────────────────────────────────┐
│ ui/                     React — solo presentación          │
│  screens/ · components/ · effects/                         │
│  - Renderiza el estado. No calcula reglas. No mide tiempo. │
├───────────────────────────────────────────────────────────┤
│ application/            Hooks — el "ViewModel"             │
│  useGameEngine · useCountdown · useAudio · useHaptics      │
│  - Orquesta: reloj, efectos, persistencia.                 │
│  - Despacha acciones al reducer del dominio.               │
├───────────────────────────────────────────────────────────┤
│ domain/                 TypeScript puro                    │
│  difficulty · numberGenerator · scoring · gameMachine      │
│  - Reglas del juego. Sin React, sin DOM, sin Date.now().   │
│  - 100% testeable con Vitest.                              │
├───────────────────────────────────────────────────────────┤
│ data/                   Persistencia                       │
│  statsRepository · settingsRepository (localStorage)       │
│  - Detrás de una interfaz: sustituible por una API luego.  │
└───────────────────────────────────────────────────────────┘
```

### Reglas de dependencia (no negociables)
1. `domain/` **no importa nada**: ni React, ni `window`, ni `localStorage`, ni
   `Date`. El tiempo y el azar entran como parámetros.
2. `ui/` **no importa `data/`** ni contiene lógica de juego. Recibe props y emite
   eventos.
3. Solo `application/` conoce las cuatro capas a la vez.

Es la traducción del MVVM de MentePro: dominio → dominio, ViewModel → hooks,
Views → componentes. La regla "lógica prohibida en Views" se mantiene igual.

## 4. Estado

Máquina de estados explícita en `domain/gameMachine.ts`, implementada como
reducer puro `(state, action) => state`:

```
idle → countdown → showing → answering → feedback ─┬→ showing   (quedan vidas)
                                                    └→ gameOver  (0 vidas)
gameOver → idle
```

La UI nunca muta el estado directamente: despacha acciones. Todo el avance del
tiempo entra como una acción `TICK`, lo que hace la máquina determinista y
testeable sin temporizadores reales.

## 5. Herencia de MentePro

Se conserva: la generación de números (sin 0, sin repetir el anterior, RNG
inyectable), los modos **Suma** y **Mixto**, y la persistencia del modo elegido.

Se sustituye: los 5 niveles fijos elegidos en un spinner pasan a ser una **curva
de dificultad continua** que sube sola dentro de la partida (ver `game_design.md`).

Se añade: validación de la respuesta, vidas, puntuación, combos y game over —
es decir, un bucle con fracaso posible. Sin fracaso no hay "una partida más".

## 6. Comandos

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # 103 tests (dominio, datos e interfaz)
npm run typecheck  # tsc --noEmit
npm run build      # bundle de producción en dist/
```

## 7. Rendimiento y accesibilidad

- Objetivo 60 fps constantes; las animaciones usan solo `transform` y `opacity`.
- El canvas de partículas se pausa cuando no hay partículas vivas.
- `prefers-reduced-motion` desactiva shake y partículas sin tocar el juego.
- Sonido desactivable; el estado del juego nunca depende del audio.
- Contraste AA en los cinco tiers de combo; el tier nunca se comunica solo por color.
- El juego degrada sin romperse: sin `localStorage` (incógnito) juega en memoria,
  sin Web Audio se queda mudo y sin `canvas` o `matchMedia` pierde las partículas.
