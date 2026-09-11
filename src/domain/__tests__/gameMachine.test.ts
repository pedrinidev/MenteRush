import { describe, expect, it } from 'vitest'
import {
  INITIAL_LIVES,
  TIMING,
  createGameReducer,
  createInitialState,
} from '../gameMachine'
import { createSeededRandom } from '../random'
import type { Action, GameState, GameStatus } from '../types'

const reducer = createGameReducer(createSeededRandom(20260908))

/** Avanza el reloj en pasos pequeños, como haría el bucle de rAF. */
function advance(state: GameState, ms: number, step = 16): GameState {
  let current = state
  let remaining = ms
  while (remaining > 0) {
    const delta = Math.min(step, remaining)
    current = reducer(current, { type: 'TICK', deltaMs: delta })
    remaining -= delta
  }
  return current
}

/** Avanza hasta alcanzar una fase, con un tope para no colgar el test. */
function advanceTo(state: GameState, status: GameStatus, limitMs = 120_000): GameState {
  let current = state
  let spent = 0
  while (current.status !== status && spent < limitMs) {
    current = reducer(current, { type: 'TICK', deltaMs: 16 })
    spent += 16
  }
  expect(current.status).toBe(status)
  return current
}

function apply(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(reducer, state)
}

/** Partida recién arrancada, esperando la primera respuesta. */
function answeringState(mode: 'SUMA' | 'MIXTO' = 'SUMA', record = 0): GameState {
  const started = apply(createInitialState(mode, record), { type: 'START', mode, digits: 'ONE', play: 'RETO', level: 'MEDIO', record })
  return advanceTo(started, 'answering')
}

/** Falla la ronda actual a propósito y consume el feedback resultante. */
function failRound(state: GameState): GameState {
  const answering = advanceTo(state, 'answering')
  const failed = apply(answering, { type: 'SUBMIT', value: answering.total + 1 })
  return advance(failed, TIMING.FEEDBACK_WRONG_MS + 32)
}

describe('arranque', () => {
  it('START pasa de idle a la cuenta atrás', () => {
    const state = apply(createInitialState('SUMA'), { type: 'START', mode: 'SUMA', digits: 'ONE', play: 'RETO', level: 'MEDIO', record: 0 })
    expect(state.status).toBe('countdown')
    expect(state.lives).toBe(INITIAL_LIVES)
    expect(state.score).toBe(0)
  })

  it('START se ignora si la partida ya está en marcha', () => {
    const playing = answeringState()
    expect(apply(playing, { type: 'START', mode: 'SUMA', digits: 'ONE', play: 'RETO', level: 'MEDIO', record: 0 })).toBe(playing)
  })

  it('tras la cuenta atrás empieza la ronda 1 con su secuencia generada', () => {
    const state = advanceTo(
      apply(createInitialState('SUMA'), { type: 'START', mode: 'SUMA', digits: 'ONE', play: 'RETO', level: 'MEDIO', record: 0 }),
      'showing',
    )
    expect(state.round).toBe(1)
    expect(state.sequence).toHaveLength(3)
    expect(state.total).toBe(state.sequence.reduce((a, b) => a + b, 0))
    // La pantalla arranca en negro: el primer número llega tras el respiro.
    expect(state.visibleIndex).toBe(-1)
  })
})

describe('secuencia de números', () => {
  it('da un respiro en negro antes del primer número', () => {
    const showing = advanceTo(
      apply(createInitialState('SUMA'), { type: 'START', mode: 'SUMA', digits: 'ONE', play: 'RETO', level: 'MEDIO', record: 0 }),
      'showing',
    )
    expect(showing.visibleIndex).toBe(-1)
    expect(advance(showing, TIMING.PRE_ROUND_PAUSE_MS - 100).visibleIndex).toBe(-1)
    expect(advance(showing, TIMING.PRE_ROUND_PAUSE_MS + 50).visibleIndex).toBe(0)
  })

  it('avanza un número por delayMs y se apaga en la pausa final', () => {
    const showing = advanceTo(
      apply(createInitialState('SUMA'), { type: 'START', mode: 'SUMA', digits: 'ONE', play: 'RETO', level: 'MEDIO', record: 0 }),
      'showing',
    )
    const { delayMs, quantity } = showing.config
    const start = TIMING.PRE_ROUND_PAUSE_MS

    expect(advance(showing, start + delayMs).visibleIndex).toBe(1)
    expect(advance(showing, start + delayMs * 2).visibleIndex).toBe(2)

    // Consumida toda la secuencia, queda la pausa en negro antes de responder.
    const paused = advance(showing, start + delayMs * quantity + 50)
    expect(paused.status).toBe('showing')
    expect(paused.visibleIndex).toBe(-1)
  })

  it('al terminar abre la ventana de respuesta', () => {
    const state = answeringState()
    expect(state.phaseDurationMs).toBe(state.config.answerMs)
    expect(state.visibleIndex).toBe(-1)
  })
})

describe('respuesta correcta', () => {
  it('suma puntos, sube el combo y conserva las vidas', () => {
    const answering = answeringState()
    const state = apply(answering, { type: 'SUBMIT', value: answering.total })
    expect(state.status).toBe('feedback')
    expect(state.lastOutcome).toBe('correct')
    expect(state.score).toBeGreaterThan(0)
    expect(state.combo).toBe(1)
    expect(state.bestCombo).toBe(1)
    expect(state.lives).toBe(INITIAL_LIVES)
    expect(state.roundsCleared).toBe(1)
    expect(state.lastGain).toBe(state.score)
  })

  it('expone los puntos ganados para que la UI no tenga que recalcularlos', () => {
    const first = answeringState()
    const afterFirst = apply(first, { type: 'SUBMIT', value: first.total })
    const second = advanceTo(afterFirst, 'answering')
    const afterSecond = apply(second, { type: 'SUBMIT', value: second.total })

    expect(afterSecond.lastGain).toBe(afterSecond.score - afterFirst.score)
  })

  it('un fallo no otorga puntos', () => {
    const answering = answeringState()
    expect(apply(answering, { type: 'SUBMIT', value: answering.total + 1 }).lastGain).toBe(0)
  })

  it('responder rápido puntúa más que responder al límite', () => {
    const base = answeringState()
    const fast = apply(base, { type: 'SUBMIT', value: base.total })
    const slow = apply(advance(base, base.config.answerMs - 100), {
      type: 'SUBMIT',
      value: base.total,
    })
    expect(fast.score).toBeGreaterThan(slow.score)
  })

  it('tras el feedback encadena la ronda siguiente, más difícil', () => {
    const answering = answeringState()
    const feedback = apply(answering, { type: 'SUBMIT', value: answering.total })
    const next = advanceTo(feedback, 'showing')

    expect(next.round).toBe(2)
    // Las primeras rondas son de gracia: la velocidad todavía no sube.
    expect(next.config.delayMs).toBeLessThanOrEqual(answering.config.delayMs)
    expect(next.lastOutcome).toBeNull()
  })
})

describe('fallo y timeout', () => {
  it('una respuesta errónea cuesta una vida y rompe el combo', () => {
    const answering = answeringState()
    const state = apply(answering, { type: 'SUBMIT', value: answering.total + 1 })

    expect(state.lastOutcome).toBe('wrong')
    expect(state.lives).toBe(INITIAL_LIVES - 1)
    expect(state.combo).toBe(0)
    expect(state.score).toBe(0)
    expect(state.phaseDurationMs).toBe(TIMING.FEEDBACK_WRONG_MS)
  })

  it('agotar la ventana equivale a fallar', () => {
    const answering = answeringState()
    const state = advance(answering, answering.config.answerMs + 32)

    expect(state.status).toBe('feedback')
    expect(state.lastOutcome).toBe('timeout')
    expect(state.lastAnswer).toBeNull()
    expect(state.lives).toBe(INITIAL_LIVES - 1)
  })

  it('perder un combo largo se refleja en bestCombo', () => {
    let state = answeringState()
    for (let i = 0; i < 4; i++) {
      state = apply(state, { type: 'SUBMIT', value: state.total })
      state = advanceTo(state, 'answering')
    }
    expect(state.combo).toBe(4)

    const failed = apply(state, { type: 'SUBMIT', value: state.total + 7 })
    expect(failed.combo).toBe(0)
    expect(failed.bestCombo).toBe(4)
  })
})

describe('game over', () => {
  it('llega tras tres fallos y conserva el marcador', () => {
    let state = answeringState()
    for (let i = 0; i < INITIAL_LIVES; i++) {
      state = failRound(state)
    }

    expect(state.status).toBe('gameOver')
    expect(state.lives).toBe(0)
    expect(state.totalAnswers).toBe(3)
    expect(state.correctAnswers).toBe(0)
  })

  it('el tiempo ya no corre en gameOver', () => {
    let state = answeringState()
    for (let i = 0; i < INITIAL_LIVES; i++) {
      state = failRound(state)
    }
    expect(advance(state, 10_000)).toBe(state)
  })

  it('RESTART vuelve a jugar guardando el récord alcanzado', () => {
    let state = answeringState()
    state = apply(state, { type: 'SUBMIT', value: state.total })
    const earned = state.score
    state = advanceTo(state, 'answering')

    for (let i = 0; i < INITIAL_LIVES; i++) {
      state = failRound(state)
    }
    expect(state.status).toBe('gameOver')

    const restarted = apply(state, { type: 'RESTART' })
    expect(restarted.status).toBe('countdown')
    expect(restarted.score).toBe(0)
    expect(restarted.lives).toBe(INITIAL_LIVES)
    expect(restarted.record).toBe(earned)
  })
})

describe('récord', () => {
  it('se marca en cuanto se supera, en mitad de la partida', () => {
    const answering = answeringState('SUMA', 5)
    expect(answering.isNewRecord).toBe(false)

    const state = apply(answering, { type: 'SUBMIT', value: answering.total })
    expect(state.score).toBeGreaterThan(5)
    expect(state.isNewRecord).toBe(true)
  })

  it('no se marca si no se supera', () => {
    const answering = answeringState('SUMA', 100_000)
    const state = apply(answering, { type: 'SUBMIT', value: answering.total })
    expect(state.isNewRecord).toBe(false)
  })
})

describe('robustez', () => {
  it('ignora SUBMIT fuera de la fase de respuesta', () => {
    const showing = advanceTo(
      apply(createInitialState('SUMA'), { type: 'START', mode: 'SUMA', digits: 'ONE', play: 'RETO', level: 'MEDIO', record: 0 }),
      'showing',
    )
    expect(apply(showing, { type: 'SUBMIT', value: showing.total })).toBe(showing)
  })

  it('ignora ticks no positivos', () => {
    const state = answeringState()
    expect(reducer(state, { type: 'TICK', deltaMs: 0 })).toBe(state)
    expect(reducer(state, { type: 'TICK', deltaMs: -100 })).toBe(state)
  })

  it('un tick enorme no se salta fases: arrastra el sobrante', () => {
    const started = apply(createInitialState('SUMA'), { type: 'START', mode: 'SUMA', digits: 'ONE', play: 'RETO', level: 'MEDIO', record: 0 })
    const jumped = reducer(started, { type: 'TICK', deltaMs: TIMING.COUNTDOWN_MS + 500 })
    expect(jumped.status).toBe('showing')
    expect(jumped.elapsedMs).toBe(500)
  })

  it('HOME devuelve al menú con el récord actualizado', () => {
    let state = answeringState()
    state = apply(state, { type: 'SUBMIT', value: state.total })
    const earned = state.score

    const home = apply(state, { type: 'HOME' })
    expect(home.status).toBe('idle')
    expect(home.record).toBe(earned)
    expect(home.score).toBe(0)
  })
})
