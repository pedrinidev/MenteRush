# MenteRush

Cálculo mental a contrarreloj. Aparecen números uno a uno, los sumas de cabeza y
tecleas el resultado antes de que se acabe el tiempo. Encadena aciertos para
multiplicar la puntuación; tres fallos y se acabó.

Sucesor web de **MentePro** (Android/Kotlin), con un bucle de juego competitivo
y feedback sensorial: combos con cinco tiers que cambian color, sonido e
intensidad de los efectos.

## Empezar

```bash
npm install
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | 67 tests: dominio, persistencia e interfaz |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Bundle de producción en `dist/` |

## Cómo se juega

- **Escritorio**: teclas numéricas, `Enter` responde, `-` cambia el signo,
  `Backspace` borra, `Espacio` empieza y reinicia.
- **Móvil**: teclado propio en pantalla.

## Arquitectura

Sin backend ni base de datos: todo vive en el navegador. React es la única
dependencia de runtime — el sonido se sintetiza con Web Audio API y las
partículas son canvas 2D.

```
src/domain/       TypeScript puro: reglas, dificultad, puntuación, máquina de estados
src/application/  Hooks: reloj, audio, vibración, entrada, motor de partida
src/data/         Repositorios sobre localStorage
src/ui/           Componentes React
```

La documentación está en [`docs/`](docs): arquitectura, diseño de juego, flujo de
pantallas y módulos.
