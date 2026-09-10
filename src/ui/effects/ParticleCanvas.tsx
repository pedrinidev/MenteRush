import { useEffect, useRef } from 'react'
import styles from './effects.module.css'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

const GRAVITY = 0.06
const FRICTION = 0.985

/** `matchMedia` no existe en algunos WebViews ni en entornos de test. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Partículas en canvas 2D.
 *
 * El bucle de render **solo corre mientras hay partículas vivas**: en reposo el
 * componente no consume un solo frame, que es lo que permite mantener 60 fps
 * durante la secuencia de números.
 *
 * Cada cambio de `burstKey` dispara una emisión.
 */
export function ParticleCanvas({
  burstKey,
  color,
  intensity = 1,
}: {
  burstKey: number
  color: string
  intensity?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef(0)
  const runningRef = useRef(false)
  const colorRef = useRef(color)
  colorRef.current = color

  // Tamaño físico del canvas, ajustado a la densidad de pantalla.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      const ctx = canvas.getContext('2d')
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (burstKey === 0 || prefersReducedMotion()) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const originX = window.innerWidth / 2
    const originY = window.innerHeight / 2
    const count = Math.round(26 + intensity * 16)

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2.2 + Math.random() * (3.4 + intensity * 1.2)
      const maxLife = 42 + Math.random() * 34
      particlesRef.current.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        life: maxLife,
        maxLife,
        size: 2.5 + Math.random() * 3.5,
      })
    }

    if (runningRef.current) return
    runningRef.current = true

    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      const alive: Particle[] = []
      for (const p of particlesRef.current) {
        p.vx *= FRICTION
        p.vy = p.vy * FRICTION + GRAVITY
        p.x += p.vx
        p.y += p.vy
        p.life -= 1

        if (p.life > 0) {
          ctx.globalAlpha = Math.max(p.life / p.maxLife, 0)
          ctx.fillStyle = colorRef.current
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          alive.push(p)
        }
      }
      ctx.globalAlpha = 1
      particlesRef.current = alive

      if (alive.length > 0) {
        frameRef.current = requestAnimationFrame(render)
      } else {
        // Sin partículas vivas se detiene el bucle por completo.
        runningRef.current = false
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      }
    }

    frameRef.current = requestAnimationFrame(render)
  }, [burstKey, intensity])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current)
      runningRef.current = false
      particlesRef.current = []
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
