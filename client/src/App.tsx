import { useEffect, useState } from 'react'
import SignupForm from './components/SignupForm'
import HighscoreTable from './components/HighscoreTable'
import AdminPage from './components/AdminPage'
import RaceScreen from './components/RaceScreen'
import { SAMPLE_TEXT } from './texts/sample'

function App() {
  const [player, setPlayer] = useState<{ name: string; email: string } | null>(null)
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const isAdmin = path === '/admin'

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = isAdmin ? 'Type Racer - Admin' : 'Type Racer'
    }
  }, [isAdmin])

  return (
    <div style={{ width: '100%', margin: 0, padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Type Racer{isAdmin ? ' - Admin' : ''}</h1>
      {isAdmin ? (
        <AdminPage />
      ) : !player ? (
        <div className="start-grid">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Register</h2>
            <SignupForm onSuccess={setPlayer} />
          </div>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Highscores</h2>
            <HighscoreTable />
          </div>
        </div>
      ) : (
        <>
          <h1>Race</h1>
          <RaceScreen name={player.name} email={player.email} text={SAMPLE_TEXT} />
        </>
      )}
    </div>
  )
}

export default App
