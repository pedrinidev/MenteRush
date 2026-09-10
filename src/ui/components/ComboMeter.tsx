import { useEffect, useState } from 'react'
import styles from './components.module.css'

/**
 * Combo, multiplicador y tier. El tier se escribe además en texto: el color
 * nunca es el único canal que comunica el estado.
 */
export function ComboMeter({
  combo,
  multiplier,
  tier,
}: {
  combo: number
  multiplier: number
  tier: number
}) {
  const [bump, setBump] = useState(false)

  useEffect(() => {
    if (combo === 0) return
    setBump(true)
    const id = setTimeout(() => setBump(false), 320)
    return () => clearTimeout(id)
  }, [combo])

  if (combo === 0) {
    return (
      <div className={styles.combo}>
        <span className={styles.comboLabel}>Sin racha</span>
      </div>
    )
  }

  return (
    <div className={`${styles.combo} ${bump ? styles.comboBump : ''}`}>
      <span className={`${styles.comboValue} tabular`}>{combo}</span>
      <span className={styles.comboLabel}>racha · tier {tier}</span>
      <span className={styles.multiplier}>×{multiplier}</span>
    </div>
  )
}
