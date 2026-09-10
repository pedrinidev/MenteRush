import type { ResolvedTheme } from '../../application'
import styles from './components.module.css'

/**
 * Cambio de tema claro/oscuro, fijo en una esquina. Muestra el icono del tema
 * al que se va a cambiar, que es lo que el jugador quiere saber al pulsarlo.
 */
export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: ResolvedTheme
  onToggle: () => void
}) {
  const goingToDark = theme === 'light'

  return (
    <button
      className={styles.themeToggle}
      onClick={onToggle}
      aria-label={goingToDark ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={goingToDark ? 'Modo oscuro' : 'Modo claro'}
    >
      {goingToDark ? '🌙' : '☀️'}
    </button>
  )
}
