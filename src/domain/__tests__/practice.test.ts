import { describe, expect, it } from 'vitest'
import {
  INITIAL_LIVES,
  PRACTICE,
  PRACTICE_ROUNDS,
  TIMING,
  configForPractice,
  createGameReducer,
  createInitialState,
} from '../index'
import { createSeededRandom } from '../random'
import { generateRound } from '../numberGenerator'
import type { Action, GameState, GameStatus, SchoolLevel } from '../types'

const reducer = createGameReducer(createSeededRandom(20260909))

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

function advanceTo(state: GameState, status: GameStatus, limitMs = 400_000): GameState {
  let current = state
  let spent = 0
  while (current.status !== status && spent < limitMs) {
    current = reducer(current, { type: 'TICK', deltaMs: 16 })
    spent += 16
  }
  expect(current.status).toBe(status)
  return current
}

const apply = (state: GameState, ...actions: Action[]) => actions.reduce(reducer, state)

/** Arranca una sesión de práctica en el tramo indicado. */
function startPractice(level: SchoolLevel = 'MEDIO'): GameState {
  const initial = createInitialState('SUMA', 0, 'ONE', 'PRACTICA', level)
  return advanceTo(
    apply(initial, {
      type: 'START',
      mode: 'SUMA',
      digits: 'ONE',
      play: 'PRACTICA',
      level,
      record: 0,
    }),
    'answering',
  )
}

/** Falla la ronda actual y consume el feedback. */
function failRound(state: GameState): GameState {
  const answering = advanceTo(state, 'answering')
  const failed = apply(answering, { type: 'SUBMIT', value: answering.total + 7 })
  return advance(failed, TIMING.FEEDBACK_WRONG_MS + 50)
}

describe('configuración de práctica', () => {
  it('da mucho más tiempo por número que el modo reto', () => {
    for (const level of ['INICIAL', 'MEDIO', 'AVANZADO'] as const) {
      expect(configForPractice(level).delayMs).toBeGreaterThanOrEqual(2000)
      expect(configForPractice(level).answerMs).toBeGreaterThanOrEqual(6000)
    }
  })

  it('nunca usa negativos ni dos cifras', () => {
    for (const level of ['INICIAL', 'MEDIO', 'AVANZADO'] as const) {
      const config = configForPractice(level)
      expect(config.negative).toBeNull()
      expect(config.positive.min).toBe(1)
      expect(config.positive.max).toBeLessThanOrEqual(9)
    }
  })

  it('el tramo inicial es el más suave de todos', () => {
    expect(PRACTICE.INICIAL.quantity).toBeLessThan(PRACTICE.AVANZADO.quantity)
    expect(PRACTICE.INICIAL.delayMs).toBeGreaterThan(PRACTICE.AVANZADO.delayMs)
    expect(PRACTICE.INICIAL.max).toBeLessThan(PRACTICE.AVANZADO.max)
  })

  it('los números generados son siempre positivos y pequeños', () => {
    const config = configForPractice('INICIAL')
    for (let i = 0; i < 100; i++) {
      for (const n of generateRound(config, createSeededRandom(i)).numbers) {
        expect(n).toBeGreaterThanOrEqual(1)
        expect(n).toBeLessThanOrEqual(PRACTICE.INICIAL.max)
      }
    }
  })

  it('no acelera: todas las rondas de la sesión son iguales', () => {
    const primera = configForPractice('MEDIO')
    // La configuración no depende de la ronda, por eso ni la recibe.
    expect(configForPractice('MEDIO')).toEqual(primera)
  })
})

describe('sesión de práctica', () => {
  it('fallar no cuesta vidas', () => {
    let state = startPractice()
    for (let i = 0; i < 4; i++) state = failRound(state)

    expect(state.lives).toBe(INITIAL_LIVES)
    expect(state.status).not.toBe('gameOver')
    expect(state.totalAnswers).toBe(4)
    expect(state.correctAnswers).toBe(0)
  })

  it('el combo sí se rompe al fallar', () => {
    const answering = startPractice()
    const acertada = apply(answering, { type: 'SUBMIT', value: answering.total })
    expect(acertada.combo).toBe(1)

    const siguiente = advanceTo(acertada, 'answering')
    expect(apply(siguiente, { type: 'SUBMIT', value: siguiente.total + 1 }).combo).toBe(0)
  })

  it('termina al completar las rondas de la sesión', () => {
    let state = startPractice()
    for (let i = 0; i < PRACTICE_ROUNDS; i++) state = failRound(state)

    expect(state.status).toBe('gameOver')
    expect(state.round).toBe(PRACTICE_ROUNDS)
  })

  it('no termina antes de tiempo', () => {
    let state = startPractice()
    for (let i = 0; i < PRACTICE_ROUNDS - 1; i++) state = failRound(state)

    expect(state.status).not.toBe('gameOver')
    expect(state.roundLimit).toBe(PRACTICE_ROUNDS)
  })

  it('el modo reto sigue sin límite de rondas y con vidas', () => {
    const state = createInitialState('SUMA', 0, 'ONE', 'RETO')
    expect(state.roundLimit).toBeNull()
    expect(state.lives).toBe(INITIAL_LIVES)
  })

  it('conserva el modo y el tramo al reiniciar la sesión', () => {
    let state = startPractice('INICIAL')
    for (let i = 0; i < PRACTICE_ROUNDS; i++) state = failRound(state)

    const otra = apply(state, { type: 'RESTART' })
    expect(otra.play).toBe('PRACTICA')
    expect(otra.level).toBe('INICIAL')
    expect(otra.roundLimit).toBe(PRACTICE_ROUNDS)
  })
})
