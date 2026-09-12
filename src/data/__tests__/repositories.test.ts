import { describe, expect, it } from 'vitest'
import { EMPTY_STATS, accuracyOf, createStatsRepository } from '../statsRepository'
import { DEFAULT_SETTINGS, createSettingsRepository } from '../settingsRepository'
import { LEGACY_STATS_KEY, STORAGE_KEYS, type StorageLike } from '../storageKeys'

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
    expect(createStatsRepository(fakeStorage()).load('RETO')).toEqual(EMPTY_STATS)
  })

  it('guarda y recupera', () => {
    const storage = fakeStorage()
    const repo = createStatsRepository(storage)
    repo.save('RETO', { ...EMPTY_STATS, record: 1200, bestCombo: 9 })

    expect(createStatsRepository(storage).load('RETO')).toMatchObject({
      record: 1200,
      bestCombo: 9,
    })
  })

  it('acumula partidas y se queda con lo mejor', () => {
    const repo = createStatsRepository(fakeStorage())
    repo.registerGame('RETO', { score: 500, bestCombo: 4, correctAnswers: 6, totalAnswers: 9 })
    const stats = repo.registerGame('RETO', {
      score: 300,
      bestCombo: 7,
      correctAnswers: 3,
      totalAnswers: 5,
    })

    expect(stats.record).toBe(500) // no retrocede
    expect(stats.bestCombo).toBe(7) // sí mejora
    expect(stats.gamesPlayed).toBe(2)
    expect(stats.correctAnswers).toBe(9)
    expect(stats.totalAnswers).toBe(14)
  })

  it('cada modo lleva sus propias estadísticas', () => {
    const repo = createStatsRepository(fakeStorage())
    repo.registerGame('RETO', { score: 900, bestCombo: 8, correctAnswers: 9, totalAnswers: 11 })
    repo.registerGame('PRACTICA', { score: 120, bestCombo: 3, correctAnswers: 7, totalAnswers: 10 })

    // Un récord fácil de Práctica no puede contaminar el de Reto, ni al revés.
    expect(repo.load('RETO').record).toBe(900)
    expect(repo.load('PRACTICA').record).toBe(120)
    expect(repo.load('RETO').gamesPlayed).toBe(1)
    expect(repo.load('PRACTICA').gamesPlayed).toBe(1)
  })

  it('rescata el récord antiguo como estadísticas de Reto', () => {
    // Antes de separar por modo solo existía este bloque, y todo era Reto.
    const repo = createStatsRepository(
      fakeStorage({
        [LEGACY_STATS_KEY]: JSON.stringify({ record: 944, bestCombo: 10, gamesPlayed: 13 }),
      }),
    )
    expect(repo.load('RETO')).toMatchObject({ record: 944, bestCombo: 10, gamesPlayed: 13 })
    expect(repo.load('PRACTICA')).toEqual(EMPTY_STATS)
  })

  it('ignora un JSON corrupto en vez de romper', () => {
    const repo = createStatsRepository(fakeStorage({ [STORAGE_KEYS.stats]: '{no es json' }))
    expect(repo.load('RETO')).toEqual(EMPTY_STATS)
  })

  it('sanea valores manipulados', () => {
    const repo = createStatsRepository(
      fakeStorage({
        [STORAGE_KEYS.stats]: JSON.stringify({
          RETO: { record: -5, bestCombo: 'x', gamesPlayed: 2.7 },
        }),
      }),
    )
    expect(repo.load('RETO')).toEqual({ ...EMPTY_STATS, gamesPlayed: 2 })
  })

  it('sobrevive a un almacenamiento hostil', () => {
    const repo = createStatsRepository(hostileStorage)
    expect(repo.load('RETO')).toEqual(EMPTY_STATS)
    expect(() => repo.save('RETO', { ...EMPTY_STATS, record: 10 })).not.toThrow()
  })

  it('sin almacenamiento funciona en memoria durante la sesión', () => {
    const repo = createStatsRepository(null)
    repo.save('RETO', { ...EMPTY_STATS, record: 777 })
    expect(repo.load('RETO').record).toBe(777)
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
    const guardado = {
      mode: 'MIXTO',
      digits: 'TWO',
      play: 'PRACTICA',
      level: 'INICIAL',
      sound: false,
      haptics: true,
      theme: 'light',
    } as const

    createSettingsRepository(storage).save(guardado)
    expect(createSettingsRepository(storage).load()).toEqual(guardado)
  })

  it('el tema parte de "auto" y descarta valores desconocidos', () => {
    expect(createSettingsRepository(fakeStorage()).load().theme).toBe('auto')

    const repo = createSettingsRepository(
      fakeStorage({ [STORAGE_KEYS.settings]: JSON.stringify({ theme: 'neón' }) }),
    )
    expect(repo.load().theme).toBe('auto')
  })

  it('el modo de juego parte en Reto y el tramo en Medio', () => {
    const repo = createSettingsRepository(fakeStorage())
    expect(repo.load().play).toBe('RETO')
    expect(repo.load().level).toBe('MEDIO')
  })

  it('descarta un tramo escolar desconocido', () => {
    const repo = createSettingsRepository(
      fakeStorage({ [STORAGE_KEYS.settings]: JSON.stringify({ play: 'X', level: 'UNIVERSIDAD' }) }),
    )
    expect(repo.load().play).toBe('RETO')
    expect(repo.load().level).toBe('MEDIO')
  })

  it('cualquier modo desconocido cae en SUMA', () => {
    const repo = createSettingsRepository(
      fakeStorage({ [STORAGE_KEYS.settings]: JSON.stringify({ mode: 'RARO' }) }),
    )
    expect(repo.load().mode).toBe('SUMA')
  })
})
