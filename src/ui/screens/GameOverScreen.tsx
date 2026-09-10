import { useEffect } from 'react'
import type { GameEngine } from '../../application'
import { ThemeToggle } from '../components/ThemeToggle'
import styles from './screens.module.css'

/**
 * Resultado final. El reinicio es el camino crítico: `Espacio` o `Enter` vuelven
 * a jugar sin pasar por el menú.
 */
export function GameOverScreen({ engine }: { engine: GameEngine }) {
  const { state, stats, theme, restart, home, toggleTheme } = engine

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        restart()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [restart])

  const accuracy =
    state.totalAnswers > 0 ? Math.round((state.correctAnswers / state.totalAnswers) * 100) : 0

  return (
    <div className={styles.screen}>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      <div>
        <span className={styles.finalLabel}>Puntuación</span>
        <div className={`${styles.finalScore} tabular`}>{state.score}</div>
        {state.isNewRecord ? (
          <span className={styles.recordBanner}>¡Nuevo récord!</span>
        ) : (
          <span className={styles.finalLabel}>Récord: {stats.record}</span>
        )}
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} tabular`}>{state.roundsCleared}</span>
          <span className={styles.statLabel}>Rondas</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} tabular`}>{state.bestCombo}</span>
          <span className={styles.statLabel}>Mejor racha</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} tabular`}>{accuracy}%</span>
          <span className={styles.statLabel}>Precisión</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} tabular`}>{state.round}</span>
          <span className={styles.statLabel}>Última ronda</span>
        </div>
      </div>

      <button className={styles.primaryButton} onClick={restart}>
        OTRA VEZ
      </button>
      <button className={styles.secondaryButton} onClick={home}>
        Inicio
      </button>

      <p className={styles.keyHint}>
        <kbd>Espacio</kbd> para volver a jugar
      </p>
    </div>
  )
}
