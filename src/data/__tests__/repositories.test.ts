import { describe, expect, it } from 'vitest'
import { EMPTY_STATS, accuracyOf, createStatsRepository } from '../statsRepository'
import { DEFAULT_SETTINGS, createSettingsRepository } from '../settingsRepository'
import { STORAGE_KEYS, type StorageLike } from '../storageKeys'

/** Doble de `localStorage` en memoria. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

/** Almacenamiento que falla siempre, como en modo incógnito o con cuota llena. */
const hostileStorage: StorageLike = {
  getItem() {
    throw new Error('acceso denegado')
  },
  setItem() {
    throw new Error('cuota llena')
  },
}

describe('statsRepository', () => {
  it('parte de estadísticas vacías', () => {
    expect(createStatsRepository(fakeStorage()).load()).toEqual(EMPTY_STATS)
  })

  it('guarda y recupera', () => {
    const storage = fakeStorage()
    const repo = createStatsRepository(storage)
    repo.save({ ...EMPTY_STATS, record: 1200, bestCombo: 9 })

    expect(createStatsRepository(storage).load()).toMatchObject({ record: 1200, bestCombo: 9 })
  })

  it('acumula partidas y se queda con lo mejor', () => {
    const repo = createStatsRepository(fakeStorage())
    repo.registerGame({ score: 500, bestCombo: 4, correctAnswers: 6, totalAnswers: 9 })
    const stats = repo.registerGame({ score: 300, bestCombo: 7, correctAnswers: 3, totalAnswers: 5 })

    expect(stats.record).toBe(500) // no retrocede
    expect(stats.bestCombo).toBe(7) // sí mejora
    expect(stats.gamesPlayed).toBe(2)
    expect(stats.correctAnswers).toBe(9)
    expect(stats.totalAnswers).toBe(14)
  })

  it('ignora un JSON corrupto en vez de romper', () => {
    const repo = createStatsRepository(fakeStorage({ [STORAGE_KEYS.stats]: '{no es json' }))
    expect(repo.load()).toEqual(EMPTY_STATS)
  })

  it('sanea valores manipulados', () => {
    const repo = createStatsRepository(
      fakeStorage({
        [STORAGE_KEYS.stats]: JSON.stringify({ record: -5, bestCombo: 'x', gamesPlayed: 2.7 }),
      }),
    )
    expect(repo.load()).toEqual({ ...EMPTY_STATS, gamesPlayed: 2 })
  })

  it('sobrevive a un almacenamiento hostil', () => {
    const repo = createStatsRepository(hostileStorage)
    expect(repo.load()).toEqual(EMPTY_STATS)
    expect(() => repo.save({ ...EMPTY_STATS, record: 10 })).not.toThrow()
  })

  it('sin almacenamiento funciona en memoria durante la sesión', () => {
    const repo = createStatsRepository(null)
    repo.save({ ...EMPTY_STATS, record: 777 })
    expect(repo.load().record).toBe(777)
  })
})

describe('accuracyOf', () => {
  it('es 0 sin respuestas', () => {
    expect(accuracyOf(EMPTY_STATS)).toBe(0)
  })

  it('redondea al entero más cercano', () => {
    expect(accuracyOf({ ...EMPTY_STATS, correctAnswers: 2, totalAnswers: 3 })).toBe(67)
  })
})

describe('settingsRepository', () => {
  it('usa los valores por defecto', () => {
    expect(createSettingsRepository(fakeStorage()).load()).toEqual(DEFAULT_SETTINGS)
  })

  it('persiste el modo elegido', () => {
    const storage = fakeStorage()
    createSettingsRepository(storage).save({
      mode: 'MIXTO',
      digits: 'TWO',
      sound: false,
      haptics: true,
      theme: 'light',
    })

    expect(createSettingsRepository(storage).load()).toEqual({
      mode: 'MIXTO',
      digits: 'TWO',
      sound: false,
      haptics: true,
      theme: 'light',
    })
  })

  it('el tema parte de "auto" y descarta valores desconocidos', () => {
    expect(createSettingsRepository(fakeStorage()).load().theme).toBe('auto')

    const repo = createSettingsRepository(
      fakeStorage({ [STORAGE_KEYS.settings]: JSON.stringify({ theme: 'neón' }) }),
    )
    expect(repo.load().theme).toBe('auto')
  })

  it('cualquier modo desconocido cae en SUMA', () => {
    const repo = createSettingsRepository(
      fakeStorage({ [STORAGE_KEYS.settings]: JSON.stringify({ mode: 'RARO' }) }),
    )
    expect(repo.load().mode).toBe('SUMA')
  })
})
