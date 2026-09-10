import { STORAGE_KEYS, type StorageLike } from './storageKeys'

/** Estadísticas acumuladas del jugador en este dispositivo. */
export interface Stats {
  readonly record: number
  readonly bestCombo: number
  readonly gamesPlayed: number
  readonly correctAnswers: number
  readonly totalAnswers: number
}

export const EMPTY_STATS: Stats = {
  record: 0,
  bestCombo: 0,
  gamesPlayed: 0,
  correctAnswers: 0,
  totalAnswers: 0,
}

/** Resultado de una partida terminada. */
export interface GameResult {
  readonly score: number
  readonly bestCombo: number
  readonly correctAnswers: number
  readonly totalAnswers: number
}

export interface StatsRepository {
  load(): Stats
  save(stats: Stats): void
  /** Acumula una partida y devuelve las estadísticas ya guardadas. */
  registerGame(result: GameResult): Stats
}

/** Entero no negativo, o el valor por defecto si el dato está corrupto. */
function readCount(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback
}

/** Valida la forma de lo leído: un JSON manipulado no debe romper el juego. */
function parseStats(raw: string | null): Stats {
  if (!raw) return EMPTY_STATS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_STATS
    const data = parsed as Record<string, unknown>
    return {
      record: readCount(data['record'], 0),
      bestCombo: readCount(data['bestCombo'], 0),
      gamesPlayed: readCount(data['gamesPlayed'], 0),
      correctAnswers: readCount(data['correctAnswers'], 0),
      totalAnswers: readCount(data['totalAnswers'], 0),
    }
  } catch {
    return EMPTY_STATS
  }
}

/**
 * Repositorio de estadísticas. Con `storage` nulo funciona en memoria, de forma
 * que la ausencia de almacenamiento nunca impide jugar.
 */
export function createStatsRepository(storage: StorageLike | null): StatsRepository {
  let memory: Stats = EMPTY_STATS

  return {
    load(): Stats {
      if (!storage) return memory
      try {
        return parseStats(storage.getItem(STORAGE_KEYS.stats))
      } catch {
        return EMPTY_STATS
      }
    },

    save(stats: Stats): void {
      memory = stats
      if (!storage) return
      try {
        storage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats))
      } catch {
        // Cuota llena o escritura denegada: la partida en curso no debe caerse.
      }
    },

    registerGame(result: GameResult): Stats {
      const previous = this.load()
      const updated: Stats = {
        record: Math.max(previous.record, result.score),
        bestCombo: Math.max(previous.bestCombo, result.bestCombo),
        gamesPlayed: previous.gamesPlayed + 1,
        correctAnswers: previous.correctAnswers + result.correctAnswers,
        totalAnswers: previous.totalAnswers + result.totalAnswers,
      }
      this.save(updated)
      return updated
    },
  }
}

/** Precisión acumulada en tanto por ciento (0 si aún no hay respuestas). */
export function accuracyOf(stats: Stats): number {
  if (stats.totalAnswers === 0) return 0
  return Math.round((stats.correctAnswers / stats.totalAnswers) * 100)
}
