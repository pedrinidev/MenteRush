import { describe, expect, it } from 'vitest'
import { configForRound } from '../difficulty'
import { generateRound } from '../numberGenerator'
import { createSeededRandom } from '../random'
import type { DigitMode, OperationMode } from '../types'

const seeded = () => createSeededRandom(20260908)

/** Todas las combinaciones de modo y tamaño, que deben cumplir las mismas reglas. */
const COMBOS: Array<[OperationMode, DigitMode]> = [
  ['SUMA', 'ONE'],
  ['SUMA', 'TWO'],
  ['MIXTO', 'ONE'],
  ['MIXTO', 'TWO'],
]

describe('generateRound', () => {
  it('genera exactamente la cantidad configurada', () => {
    const config = configForRound(10, 'SUMA')
    expect(generateRound(config, seeded()).numbers).toHaveLength(config.quantity)
  })

  it('nunca genera el 0', () => {
    for (const [mode, digits] of COMBOS) {
      const config = configForRound(20, mode, digits)
      for (let i = 0; i < 60; i++) {
        expect(generateRound(config, createSeededRandom(i)).numbers).not.toContain(0)
      }
    }
  })

  it('nunca repite el número inmediatamente anterior', () => {
    for (const [mode, digits] of COMBOS) {
      const config = configForRound(30, mode, digits)
      for (let i = 0; i < 60; i++) {
        const { numbers } = generateRound(config, createSeededRandom(i))
        for (let n = 1; n < numbers.length; n++) {
          expect(numbers[n]).not.toBe(numbers[n - 1])
        }
      }
    }
  })

  it('respeta los rangos de positivos y negativos', () => {
    for (const [mode, digits] of COMBOS) {
      const config = configForRound(25, mode, digits)
      for (let i = 0; i < 60; i++) {
        for (const n of generateRound(config, createSeededRandom(i)).numbers) {
          if (n > 0) {
            expect(n).toBeGreaterThanOrEqual(config.positive.min)
            expect(n).toBeLessThanOrEqual(config.positive.max)
          } else {
            expect(config.negative).not.toBeNull()
            expect(n).toBeGreaterThanOrEqual(config.negative!.min)
            expect(n).toBeLessThanOrEqual(config.negative!.max)
          }
        }
      }
    }
  })

  it('el primer número siempre es alto y positivo', () => {
    for (const [mode, digits] of COMBOS) {
      const config = configForRound(20, mode, digits)
      for (let i = 0; i < 60; i++) {
        const first = generateRound(config, createSeededRandom(i)).numbers[0] as number
        expect(first).toBeGreaterThanOrEqual(config.first.min)
        expect(first).toBeLessThanOrEqual(config.first.max)
      }
    }
  })

  it('el total nunca es negativo: el jugador no necesita teclear el signo', () => {
    for (const [mode, digits] of COMBOS) {
      for (const round of [1, 12, 40]) {
        const config = configForRound(round, mode, digits)
        for (let i = 0; i < 60; i++) {
          expect(generateRound(config, createSeededRandom(i)).total).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('la suma parcial tampoco baja de 0 en ningún momento', () => {
    for (const [mode, digits] of COMBOS) {
      const config = configForRound(40, mode, digits)
      for (let i = 0; i < 60; i++) {
        let running = 0
        for (const n of generateRound(config, createSeededRandom(i)).numbers) {
          running += n
          expect(running).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('el total nunca pasa de tres dígitos', () => {
    for (const [mode, digits] of COMBOS) {
      const config = configForRound(100, mode, digits)
      for (let i = 0; i < 60; i++) {
        expect(generateRound(config, createSeededRandom(i)).total).toBeLessThan(1000)
      }
    }
  })

  it('el total es la suma de la secuencia', () => {
    const round = generateRound(configForRound(12, 'MIXTO'), seeded())
    expect(round.total).toBe(round.numbers.reduce((a, b) => a + b, 0))
  })

  it('es determinista: misma semilla, misma secuencia', () => {
    const config = configForRound(8, 'MIXTO')
    expect(generateRound(config, createSeededRandom(7)).numbers).toEqual(
      generateRound(config, createSeededRandom(7)).numbers,
    )
  })

  it('semillas distintas producen secuencias distintas', () => {
    const config = configForRound(12, 'MIXTO')
    expect(generateRound(config, createSeededRandom(1)).numbers).not.toEqual(
      generateRound(config, createSeededRandom(2)).numbers,
    )
  })

  it('rechaza un rango sin candidatos suficientes', () => {
    expect(() =>
      generateRound({
        quantity: 3,
        delayMs: 500,
        answerMs: 3000,
        positive: { min: 5, max: 5 },
        negative: null,
        first: { min: 5, max: 5 },
      }),
    ).toThrow(/Rango insuficiente/)
  })
})
