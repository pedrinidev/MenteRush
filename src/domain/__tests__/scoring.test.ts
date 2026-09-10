import { describe, expect, it } from 'vitest'
import { SCORING, multiplierFor, pointsFor, speedBonus, tierFor } from '../scoring'

describe('multiplierFor', () => {
  it('sube medio punto cada 3 aciertos', () => {
    expect(multiplierFor(0)).toBe(1)
    expect(multiplierFor(2)).toBe(1)
    expect(multiplierFor(3)).toBe(1.5)
    expect(multiplierFor(6)).toBe(2)
    expect(multiplierFor(9)).toBe(2.5)
  })

  it('tiene tope ×5', () => {
    expect(multiplierFor(24)).toBe(SCORING.MAX_MULTIPLIER)
    expect(multiplierFor(500)).toBe(SCORING.MAX_MULTIPLIER)
  })

  it('trata un combo negativo como 0', () => {
    expect(multiplierFor(-3)).toBe(1)
  })
})

describe('speedBonus', () => {
  it('premia la respuesta instantánea con un 50% extra', () => {
    expect(speedBonus(3000, 3000)).toBe(1.5)
  })

  it('no da bonus al responder justo al límite', () => {
    expect(speedBonus(0, 3000)).toBe(1)
  })

  it('escala linealmente', () => {
    expect(speedBonus(1500, 3000)).toBe(1.25)
  })

  it('resiste valores degenerados', () => {
    expect(speedBonus(100, 0)).toBe(1)
    expect(speedBonus(-100, 3000)).toBe(1)
    expect(speedBonus(9999, 3000)).toBe(1.5)
  })
})

describe('tierFor', () => {
  it('sube un tier cada 3 aciertos y satura en 4', () => {
    expect(tierFor(0)).toBe(0)
    expect(tierFor(2)).toBe(0)
    expect(tierFor(3)).toBe(1)
    expect(tierFor(6)).toBe(2)
    expect(tierFor(9)).toBe(3)
    expect(tierFor(12)).toBe(4)
    expect(tierFor(99)).toBe(SCORING.MAX_TIER)
  })
})

describe('pointsFor', () => {
  it('combina base, multiplicador y velocidad', () => {
    // 10 × 5 números × ×1.5 (combo 3) × 1.5 (instantáneo) = 112.5 → 113
    expect(pointsFor({ quantity: 5, combo: 3, timeLeftMs: 3000, answerMs: 3000 })).toBe(113)
  })

  it('sin combo ni velocidad es solo la base', () => {
    expect(pointsFor({ quantity: 4, combo: 0, timeLeftMs: 0, answerMs: 3000 })).toBe(40)
  })

  it('una racha larga vale mucho más que una respuesta suelta', () => {
    const solo = pointsFor({ quantity: 8, combo: 0, timeLeftMs: 1000, answerMs: 3000 })
    const racha = pointsFor({ quantity: 8, combo: 15, timeLeftMs: 1000, answerMs: 3000 })
    expect(racha).toBeGreaterThan(solo * 3)
  })
})
