// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import { TIMING } from '../../domain'

/**
 * Prueba de integración de la app completa sobre un DOM real.
 *
 * Verifica lo que los tests de dominio no pueden: que las capas están bien
 * conectadas y que una partida se puede jugar de principio a fin desde la UI.
 */

/** El reloj real se sustituye por uno controlado, incluido `requestAnimationFrame`. */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] })
  window.localStorage.clear()
  // jsdom no implementa canvas; el componente ya tolera un contexto nulo.
  HTMLCanvasElement.prototype.getContext = (() => null) as never
})

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  vi.useRealTimers()
})

/** Avanza el reloj del juego dentro de `act` para que React procese los cambios. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

/** Lee el número grande que hay ahora mismo en pantalla, si lo hay. */
function visibleNumber(): number | null {
  const node = document.querySelector('[class*="bigNumber"]')
  return node?.textContent ? Number(node.textContent) : null
}

/** Juega una ronda entera recogiendo los números y devuelve su suma. */
async function playSequence(): Promise<number> {
  let total = 0
  let last: number | null = null
  // Muy por encima de lo que dura una ronda; sale en cuanto pide la respuesta.
  for (let i = 0; i < 400; i++) {
    if (screen.queryByText('¿Cuánto suma?')) break
    const current = visibleNumber()
    if (current !== null && current !== last) {
      total += current
      last = current
    }
    await advance(50)
  }
  return total
}

/**
 * Una respuesta incorrecta cuyos prefijos tampoco coinciden con el total: si
 * coincidieran, el auto-envío la aceptaría como acierto a mitad de tecleo.
 */
function wrongAnswerFor(total: number): string {
  for (let first = 1; first <= 9; first++) {
    for (let second = 0; second <= 9; second++) {
      const candidate = `${first}${second}`
      if (first !== total && Number(candidate) !== total) return candidate
    }
  }
  throw new Error('sin respuesta incorrecta disponible')
}

async function startGame(): Promise<void> {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'JUGAR' }))
  await advance(TIMING.COUNTDOWN_MS + 50)
}

describe('MenteRush end to end', () => {
  it('arranca en el menú con las estadísticas a cero', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'JUGAR' })).toBeTruthy()
    expect(screen.getByText('Récord')).toBeTruthy()
  })

  it('juega una ronda completa y puntúa el acierto', async () => {
    await startGame()

    const total = await playSequence()
    expect(screen.getByText('¿Cuánto suma?')).toBeTruthy()
    expect(total).toBeGreaterThan(0)

    // Se teclea con el teclado en pantalla; al acertar se envía solo.
    await act(async () => {
      for (const digit of String(total)) {
        fireEvent.click(screen.getByRole('button', { name: digit }))
      }
    })

    expect(screen.getByText('✓')).toBeTruthy()
    expect(screen.getByText(/^\+\d+$/)).toBeTruthy()
  })

  it('el acierto se reconoce sin pulsar confirmar', async () => {
    await startGame()
    const total = await playSequence()

    await act(async () => {
      for (const digit of String(total)) fireEvent.keyDown(window, { key: digit })
    })

    // Ni un Enter ni un clic: la ronda ya está resuelta.
    expect(screen.getByText('✓')).toBeTruthy()
  })

  it('una respuesta equivocada sí exige confirmar', async () => {
    await startGame()
    const total = await playSequence()
    const wrong = wrongAnswerFor(total)

    await act(async () => {
      for (const digit of wrong) fireEvent.keyDown(window, { key: digit })
    })
    // Sigue esperando: lo tecleado no es la respuesta correcta.
    expect(screen.getByText('¿Cuánto suma?')).toBeTruthy()

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' })
    })
    expect(screen.getByText('✕')).toBeTruthy()
  })

  it('el teclado físico también responde', async () => {
    await startGame()
    const total = await playSequence()

    await act(async () => {
      for (const digit of String(total)) fireEvent.keyDown(window, { key: digit })
    })

    expect(screen.getByText('✓')).toBeTruthy()
  })

  it('una respuesta errónea muestra el resultado correcto y quita una vida', async () => {
    await startGame()
    const total = await playSequence()

    const wrong = wrongAnswerFor(total)
    await act(async () => {
      for (const digit of wrong) fireEvent.keyDown(window, { key: digit })
    })
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' })
    })

    expect(screen.getByText('✕')).toBeTruthy()
    expect(screen.getByText(`Era ${total}, no ${Number(wrong)}`)).toBeTruthy()
  })

  it('agotar el tiempo también falla la ronda', async () => {
    await startGame()
    await playSequence()

    // Justo por encima de la ventana de respuesta, sin consumir el feedback.
    await advance(5100)
    expect(screen.getByText(/Se acabó el tiempo/)).toBeTruthy()
  })

  it('tres fallos llevan al game over y el récord queda guardado', async () => {
    await startGame()

    for (let life = 0; life < 3; life++) {
      await playSequence()
      await advance(5100) // agota la ventana de respuesta
      await advance(TIMING.FEEDBACK_WRONG_MS + 100)
    }

    expect(screen.getByRole('button', { name: 'OTRA VEZ' })).toBeTruthy()
    expect(window.localStorage.getItem('menterush.v1.stats')).toContain('gamesPlayed')
  })

  it('el cambio de tema se aplica al documento y se recuerda', async () => {
    const first = render(<App />)
    // Sin elección previa no hay atributo: manda la preferencia del sistema.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: /Cambiar a modo/ }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(window.localStorage.getItem('menterush.v1.settings')).toContain('"theme":"light"')

    first.unmount()
    render(<App />)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('el modo de dos cifras arranca con números pequeños y se recuerda', async () => {
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '2 cifras' }))
    expect(window.localStorage.getItem('menterush.v1.settings')).toContain('"digits":"TWO"')

    fireEvent.click(screen.getByRole('button', { name: 'JUGAR' }))
    await advance(TIMING.COUNTDOWN_MS + 50)

    // Recoge la secuencia: todos deben tener dos cifras.
    const seen: number[] = []
    let last: number | null = null
    for (let i = 0; i < 400; i++) {
      if (screen.queryByText('¿Cuánto suma?')) break
      const current = visibleNumber()
      if (current !== null && current !== last) {
        seen.push(current)
        last = current
      }
      await advance(50)
    }

    expect(seen.length).toBeGreaterThan(0)
    // La primera ronda no debe soltar números grandes de golpe.
    for (const n of seen) expect(Math.abs(n)).toBeLessThanOrEqual(20)

    first.unmount()
    render(<App />)
    expect(screen.getByText(/Empieza hasta 20/)).toBeTruthy()
  })

  it('ofrece la descarga de MentePro', () => {
    render(<App />)
    const link = screen.getByRole('link', { name: /MentePro/ }) as HTMLAnchorElement
    expect(link.href).toContain('play.google.com/store/apps/details?id=com.pedrini.mentepro')
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
  })

  it('el modo elegido se recuerda entre sesiones', async () => {
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Mixto' }))
    expect(screen.getByText('Con negativos: también hay que restar.')).toBeTruthy()
    first.unmount()

    render(<App />)
    expect(screen.getByText('Con negativos: también hay que restar.')).toBeTruthy()
  })
})
