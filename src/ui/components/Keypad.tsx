import type { Keypad as KeypadState } from '../../application'
import styles from './components.module.css'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/**
 * Teclado numérico propio. En móvil sustituye al del sistema (que tarda en
 * abrirse y tapa la pantalla); en escritorio duplica el teclado físico para que
 * las teclas disponibles estén siempre a la vista.
 *
 * No hay tecla de signo: el total nunca es negativo. La tecla de confirmar solo
 * hace falta para enviar una respuesta equivocada — al acertar se envía sola.
 */
export function Keypad({ keypad }: { keypad: KeypadState }) {
  return (
    <div className={styles.keypad}>
      {DIGITS.map((digit) => (
        <button key={digit} className={styles.key} onClick={() => keypad.append(digit)}>
          {digit}
        </button>
      ))}

      <button
        className={`${styles.key} ${styles.muted}`}
        onClick={keypad.backspace}
        aria-label="Borrar"
      >
        ⌫
      </button>

      <button className={styles.key} onClick={() => keypad.append('0')}>
        0
      </button>

      <button
        className={`${styles.key} ${styles.accent}`}
        onClick={keypad.confirm}
        disabled={keypad.value === null}
        aria-label="Responder"
      >
        ✓
      </button>
    </div>
  )
}
