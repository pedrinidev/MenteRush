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
  rotation: number
  spin: number
  color: string
}

const GRAVITY = 0.05
const FRICTION = 0.988

/** Tope de píxeles del lienzo (~10 MB de memoria gráfica). */
const MAX_CANVAS_PIXELS = 2_500_000

/**
 * Paleta de fiesta. Se mezcla con el acento de la racha para que la celebración
 * sea de colores y no un chorro monocromo del color del tier.
 */
const CONFETTI = ['#ffd93d', '#ff6b9d', '#4ecdc4', '#a78bfa', '#ffa62b', '#6bcb77', '#ffffff']

/** `matchMedia` no existe en algunos WebViews ni en entornos de test. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Dibuja una estrella de cinco puntas centrada en (x, y). */
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
): void {
  const spikes = 5
  const inner = radius * 0.45

  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : inner
    const angle = (i * Math.PI) / spikes + rotation
    const px = x + Math.cos(angle) * r
    const py = y + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

/**
 * Estrellas de colores que salen disparadas al acertar.
 *
 * El bucle de render **solo corre mientras hay estrellas vivas**: en reposo el
 * componente no consume un solo frame, que es lo que permite mantener 60 fps
 * durante la secuencia de números.
 *
 * Cada cambio de `burstKey` dispara una celebración.
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
      const cssPixels = window.innerWidth * window.innerHeight
      // Un lienzo a pantalla completa con densidad 2 son 56 MB en un monitor de
      // 2560×1440, para un efecto que dura un segundo. Se acota el área total:
      // en móvil no cambia nada (la pantalla es pequeña) y en monitores grandes
      // las estrellas se dibujan algo más suaves, que en formas en movimiento y
      // que se desvanecen no se aprecia.
      const byArea = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(cssPixels, 1))
      const dpr = Math.min(window.devicePixelRatio || 1, 2, byArea)

      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
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
    const count = Math.round(46 + intensity * 20)
    // El acento entra en el sorteo, así que la racha tiñe la celebración sin
    // apoderarse de ella.
    const palette = [...CONFETTI, colorRef.current, colorRef.current]

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2.6 + Math.random() * (4 + intensity * 1.4)
      const maxLife = 52 + Math.random() * 42
      particlesRef.current.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.6,
        life: maxLife,
        maxLife,
        size: 5 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.28,
        color: palette[Math.floor(Math.random() * palette.length)] as string,
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
        p.rotation += p.spin
        p.life -= 1

        if (p.life > 0) {
          // Se apagan en el último tercio de vida, no de golpe.
          ctx.globalAlpha = Math.min(1, (p.life / p.maxLife) * 2.2)
          ctx.fillStyle = p.color
          drawStar(ctx, p.x, p.y, p.size, p.rotation)
          alive.push(p)
        }
      }
      ctx.globalAlpha = 1
      particlesRef.current = alive

      if (alive.length > 0) {
        frameRef.current = requestAnimationFrame(render)
      } else {
        // Sin estrellas vivas se detiene el bucle por completo.
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
