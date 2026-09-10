import styles from './components.module.css'

/** Cuánto ocupa una cifra respecto a su tamaño de fuente (medido en pantalla). */
const DIGIT_RATIO = 0.8
/** El signo menos es más estrecho que una cifra (valor afinado midiendo). */
const SIGN_RATIO = 0.7
/** Porcentaje del ancho de pantalla que debe llenar el número. */
const TARGET_WIDTH_PCT = 85

/**
 * El número de la secuencia a pantalla completa. La `key` la pone quien lo usa
 * para forzar el remontaje y que la animación de entrada se repita en cada
 * número, incluso si se repite el valor.
 *
 * El tamaño se calcula para que cualquier número —una cifra, dos, o dos con
 * signo— llene lo mismo de ancho. El límite en `vh` evita que en apaisado, donde
 * sobra ancho, el número se salga por arriba.
 */
export function BigNumber({ value }: { value: number }) {
  const digits = Math.abs(value).toString().length
  const units = digits + (value < 0 ? SIGN_RATIO : 0)

  const byWidth = Math.round(TARGET_WIDTH_PCT / (DIGIT_RATIO * units))
  const byHeight = Math.max(54, Math.round(68 - (units - 1) * 6))

  return (
    <div
      className={`${styles.bigNumber} ${value < 0 ? styles.negative : ''} tabular`}
      style={{ fontSize: `min(${byWidth}vw, ${byHeight}vh)` }}
    >
      {value}
    </div>
  )
}
