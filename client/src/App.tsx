import { useEffect, useState } from 'react'
import SignupForm from './components/SignupForm'
import HighscoreTable from './components/HighscoreTable'
import AdminPage from './components/AdminPage'
import RaceScreen from './components/RaceScreen'
import { SAMPLE_TEXT } from './texts/sample'

function App() {
  const [player, setPlayer] = useState<{ name: string; email: string; leaderOpponent: boolean } | null>(null)
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const isAdmin = path === '/admin'
  const [uniqueOnly, setUniqueOnly] = useState(false)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = isAdmin ? 'Type Racer - Admin' : 'Type Racer'
    }
  }, [isAdmin])

  return (
    <div className={!isAdmin ? 'site-bg' : undefined} style={{ width: '98%', margin: 0, padding: 16, minHeight: '95vh' }}>
      <h1 style={{ marginTop: 0 }}>Type Racer{isAdmin ? ' - Admin' : ''}</h1>
      {isAdmin ? (
        <AdminPage />
      ) : !player ? (
        <div className="start-grid">
          <div className="panel">
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Register</h2>
            <SignupForm onSuccess={setPlayer} />
          </div>
          <div className="panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Highscores</h2>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={uniqueOnly} onChange={(e) => setUniqueOnly(e.target.checked)} />
                Show only best score per player
              </label>
            </div>
            <HighscoreTable showWhenEmpty uniqueOnly={uniqueOnly} />
          </div>
        </div>
      ) : (
        <RaceScreen
          name={player.name}
          email={player.email}
          text={SAMPLE_TEXT}
          useLeaderOpponent={player.leaderOpponent}
          onResetToRegister={() => setPlayer(null)}
        />
      )}
    </div>
  )
}

export default App

