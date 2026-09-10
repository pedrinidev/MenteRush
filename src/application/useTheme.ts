import { useEffect, useState } from 'react'
import type { ThemePreference } from '../data'

export type ResolvedTheme = 'light' | 'dark'

/** Lee la preferencia del sistema; `dark` si el navegador no sabe responder. */
function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Resuelve la preferencia a un tema concreto y lo aplica al documento.
 *
 * Con `auto` no se escribe ningún atributo: el CSS sigue a `prefers-color-scheme`
 * por su cuenta, y aquí solo se observa el sistema para saber qué icono mostrar.
 */
export function useTheme(preference: ThemePreference): ResolvedTheme {
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  // El sistema puede cambiar de tema mientras se juega (o al anochecer).
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: light)')
    const update = () => setSystem(query.matches ? 'light' : 'dark')
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const resolved: ResolvedTheme = preference === 'auto' ? system : preference

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (preference === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', preference)
  }, [preference])

  return resolved
}
