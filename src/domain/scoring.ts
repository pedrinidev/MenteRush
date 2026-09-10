/**
 * Puntuación, combos y tiers. La pieza que convierte el ejercicio en un juego:
 * el multiplicador hace que perder una racha larga duela.
 */

export const SCORING = {
  /** Puntos base por número acertado de la secuencia. */
  POINTS_PER_NUMBER: 10,
  /** Aciertos consecutivos necesarios para subir medio punto de multiplicador. */
  COMBO_STEP: 3,
  MULTIPLIER_STEP: 0.5,
  MAX_MULTIPLIER: 5,
  /** Responder al instante vale hasta un 50% extra. */
  MAX_SPEED_BONUS: 0.5,
  /** Tier máximo (0..4). */
  MAX_TIER: 4,
} as const

/**
 * Multiplicador para un combo dado. El combo es el que queda **después** del
 * acierto, de modo que la recompensa se siente en la misma ronda.
 *
 * combo 0-2 → ×1 · 3-5 → ×1.5 · 6-8 → ×2 … tope ×5.
 */
export function multiplierFor(combo: number): number {
  const steps = Math.floor(Math.max(0, combo) / SCORING.COMBO_STEP)
  return Math.min(1 + steps * SCORING.MULTIPLIER_STEP, SCORING.MAX_MULTIPLIER)
}

/**
 * Bonus por rapidez: 1 (respuesta al límite) a 1.5 (respuesta instantánea).
 * Una ventana no positiva no otorga bonus.
 */
export function speedBonus(timeLeftMs: number, totalMs: number): number {
  if (totalMs <= 0) return 1
  const ratio = Math.min(Math.max(timeLeftMs / totalMs, 0), 1)
  return 1 + ratio * SCORING.MAX_SPEED_BONUS
}

/** Tier de combo (0..4), que gobierna color, sonido e intensidad de efectos. */
export function tierFor(combo: number): number {
  return Math.min(Math.floor(Math.max(0, combo) / SCORING.COMBO_STEP), SCORING.MAX_TIER)
}

/** Puntos de un acierto, ya redondeados. */
export function pointsFor(params: {
  quantity: number
  combo: number
  timeLeftMs: number
  answerMs: number
}): number {
  const base = SCORING.POINTS_PER_NUMBER * params.quantity
  const bonus = speedBonus(params.timeLeftMs, params.answerMs)
  return Math.round(base * multiplierFor(params.combo) * bonus)
}
