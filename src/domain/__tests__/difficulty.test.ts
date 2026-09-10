import { describe, expect, it } from 'vitest'
import { DIFFICULTY, configForRound } from '../difficulty'

describe('configForRound', () => {
  it('arranca la ronda 1 en los valores más suaves', () => {
    expect(configForRound(1, 'SUMA')).toEqual({
      quantity: 3,
      delayMs: 1400,
      answerMs: 5000,
      positive: { min: 1, max: 9 },
      negative: null,
      first: { min: 5, max: 9 },
    })
  })

  it('añade un número cada 3 rondas', () => {
    expect(configForRound(3, 'SUMA').quantity).toBe(3)
    expect(configForRound(4, 'SUMA').quantity).toBe(4)
    expect(configForRound(7, 'SUMA').quantity).toBe(5)
  })

  it('no hay negativos en modo Suma', () => {
    for (const r of [1, 10, 50]) expect(configForRound(r, 'SUMA').negative).toBeNull()
  })

  it('en Mixto los negativos son suaves (-4..-1) y el primero es alto', () => {
    const config = configForRound(20, 'MIXTO')
    expect(config.negative).toEqual({ min: -4, max: -1 })
    expect(config.first).toEqual({ min: 5, max: 9 })
  })

  it('trata una ronda inválida como la ronda 1 en vez de fallar', () => {
    expect(configForRound(0, 'SUMA')).toEqual(configForRound(1, 'SUMA'))
    expect(configForRound(-5, 'SUMA')).toEqual(configForRound(1, 'SUMA'))
  })
})

describe('aceleración', () => {
  it('las tres primeras rondas no aceleran nada', () => {
    for (const r of [1, 2, 3]) {
      expect(configForRound(r, 'SUMA').delayMs).toBe(DIFFICULTY.BASE_DELAY_MS)
      expect(configForRound(r, 'SUMA').answerMs).toBe(DIFFICULTY.BASE_ANSWER_MS)
    }
  })

  it('a partir de la cuarta cada ronda es un 4% más rápida', () => {
    const base = DIFFICULTY.BASE_DELAY_MS
    expect(configForRound(4, 'SUMA').delayMs).toBe(Math.round(base * 0.96))
    expect(configForRound(5, 'SUMA').delayMs).toBe(Math.round(base * 0.96 ** 2))
    expect(configForRound(10, 'SUMA').delayMs).toBe(Math.round(base * 0.96 ** 7))
  })

  it('la ventana de respuesta se estrecha más despacio que la velocidad', () => {
    const r20 = configForRound(20, 'SUMA')
    const perdidoDelay = 1 - r20.delayMs / DIFFICULTY.BASE_DELAY_MS
    const perdidoVentana = 1 - r20.answerMs / DIFFICULTY.BASE_ANSWER_MS
    expect(perdidoVentana).toBeLessThan(perdidoDelay)
  })

  it('el mínimo queda lejos de una partida normal', () => {
    expect(configForRound(1, 'SUMA').delayMs).toBe(DIFFICULTY.BASE_DELAY_MS)
    expect(configForRound(30, 'SUMA').delayMs).toBeGreaterThan(DIFFICULTY.MIN_DELAY_MS)
    expect(configForRound(200, 'SUMA').delayMs).toBe(DIFFICULTY.MIN_DELAY_MS)
  })

  it('ninguna ronda acelera más del 4%: la subida se siente igual siempre', () => {
    for (let r = 1; r <= 60; r++) {
      const prev = configForRound(r, 'SUMA').delayMs
      const next = configForRound(r + 1, 'SUMA').delayMs
      // El margen absorbe el redondeo a milisegundos enteros, que en los valores
      // pequeños desvía el ratio unas centésimas por encima del 4%.
      expect(1 - next / prev).toBeLessThan(DIFFICULTY.SPEED_DECAY + 0.005)
    }
  })

  it('la dificultad nunca retrocede', () => {
    for (let r = 2; r <= 60; r++) {
      const prev = configForRound(r - 1, 'MIXTO')
      const curr = configForRound(r, 'MIXTO')
      expect(curr.quantity).toBeGreaterThanOrEqual(prev.quantity)
      expect(curr.delayMs).toBeLessThanOrEqual(prev.delayMs)
      expect(curr.answerMs).toBeLessThanOrEqual(prev.answerMs)
    }
  })
})

describe('modo de dos cifras', () => {
  it('empieza suave: las primeras rondas no pasan de 20', () => {
    for (const r of [1, 2, 3, 4]) {
      const config = configForRound(r, 'MIXTO', 'TWO')
      expect(config.positive).toEqual({ min: 1, max: DIFFICULTY.TWO_START_MAX })
      expect(config.negative).toEqual({ min: -10, max: -1 })
      expect(config.first).toEqual({ min: 10, max: 20 })
    }
  })

  it('incluye números de una cifra en las rondas iniciales', () => {
    expect(configForRound(1, 'SUMA', 'TWO').positive.min).toBe(1)
  })

  it('el techo crece ronda a ronda hasta 99', () => {
    expect(configForRound(5, 'SUMA', 'TWO').positive.max).toBe(30)
    expect(configForRound(6, 'SUMA', 'TWO').positive.max).toBe(40)
    expect(configForRound(12, 'SUMA', 'TWO').positive.max).toBe(DIFFICULTY.TWO_FINAL_MAX)
    expect(configForRound(40, 'SUMA', 'TWO').positive.max).toBe(DIFFICULTY.TWO_FINAL_MAX)
  })

  it('el techo nunca retrocede', () => {
    for (let r = 2; r <= 40; r++) {
      expect(configForRound(r, 'SUMA', 'TWO').positive.max).toBeGreaterThanOrEqual(
        configForRound(r - 1, 'SUMA', 'TWO').positive.max,
      )
    }
  })

  it('da más tiempo por número y para responder', () => {
    for (const r of [1, 10, 30]) {
      const one = configForRound(r, 'SUMA', 'ONE')
      const two = configForRound(r, 'SUMA', 'TWO')
      expect(two.delayMs).toBeGreaterThan(one.delayMs)
      expect(two.answerMs).toBeGreaterThan(one.answerMs)
    }
  })

  it('corta la ronda antes: sumar doce números de dos cifras es inhumano', () => {
    expect(configForRound(100, 'SUMA', 'TWO').quantity).toBe(
      DIFFICULTY.MAX_QUANTITY_TWO_DIGITS,
    )
    expect(configForRound(100, 'SUMA', 'ONE').quantity).toBe(DIFFICULTY.MAX_QUANTITY)
  })

  it('el total cabe en tres dígitos, como en una cifra', () => {
    const config = configForRound(100, 'SUMA', 'TWO')
    expect(config.quantity * config.positive.max).toBeLessThan(1000)
  })
})
