import { useEffect, useState } from 'react'
import HighscoreTable from './HighscoreTable'

type Player = { id: string; name: string; email: string; createdAt: string }

export default function AdminPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetOk, setResetOk] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const [clearOk, setClearOk] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    fetch('/api/players')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((arr: Player[]) => { if (!ignore) { setPlayers(arr || []) } })
      .catch((e) => { if (!ignore) setError(e.message || 'Failed to load players') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  async function resetHighscores() {
    setResetOk(null)
    setError(null)
    setResetting(true)
    try {
      const res = await fetch('/api/highscores', { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to reset')
      setResetOk('Highscores reset')
    } catch (e: any) {
      setError(e?.message || 'Failed to reset highscores')
    } finally {
      setResetting(false)
    }
  }

  async function clearPlayers() {
    setClearOk(null)
    setError(null)
    setClearing(true)
    try {
      const res = await fetch('/api/players', { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to clear players')
      setPlayers([])
      setClearOk('Players cleared')
    } catch (e: any) {
      setError(e?.message || 'Failed to clear players')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div style={{ width: '100%', padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'stretch' }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Highscores</h2>
          <div style={{ marginBottom: 12 }}>
            <button onClick={resetHighscores} disabled={resetting} style={{ padding: '10px 14px', fontWeight: 600 }}>
              {resetting ? 'Resetting…' : 'Reset Highscores'}
            </button>
            {resetOk && <span style={{ marginLeft: 12, color: '#16a34a' }}>{resetOk}</span>}
          </div>
          <HighscoreTable showEmail />
        </div>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Players</h2>
          <div style={{ marginBottom: 12 }}>
            <button onClick={clearPlayers} disabled={clearing} style={{ padding: '10px 14px', fontWeight: 600 }}>
              {clearing ? 'Clearing…' : 'Clear Players'}
            </button>
            {clearOk && <span style={{ marginLeft: 12, color: '#16a34a' }}>{clearOk}</span>}
          </div>
          {loading && <div>Loading…</div>}
          {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
          {!loading && !error && (
            <div className="hs-table hs--3" role="table">
              <div className="hs-header" role="row">
                <div className="hs-cell" role="columnheader">Name</div>
                <div className="hs-cell" role="columnheader">Email</div>
                <div className="hs-cell" role="columnheader">Created</div>
              </div>
              {[...players].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(p => (
                <div key={p.id} className="hs-row" role="row">
                  <div className="hs-cell" role="cell">{p.name}</div>
                  <div className="hs-cell" role="cell">{p.email}</div>
                  <div className="hs-cell" role="cell">{new Date(p.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
