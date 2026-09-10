import { useGameEngine } from './application'
import { GameOverScreen } from './ui/screens/GameOverScreen'
import { GameScreen } from './ui/screens/GameScreen'
import { HomeScreen } from './ui/screens/HomeScreen'

/**
 * Raíz de la aplicación. Solo decide qué pantalla toca y expone el tier de
 * combo como `data-tier`, del que cuelga toda la paleta de acento.
 */
export function App() {
  const engine = useGameEngine()
  const { status } = engine.state

  return (
    <div data-tier={engine.tier} style={{ height: '100%' }}>
      {status === 'idle' && <HomeScreen engine={engine} />}
      {status === 'gameOver' && <GameOverScreen engine={engine} />}
      {status !== 'idle' && status !== 'gameOver' && <GameScreen engine={engine} />}
    </div>
  )
}
