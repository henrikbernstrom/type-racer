import { useEffect, useRef, useState } from 'react'
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
  const [highsKey, setHighsKey] = useState(0)
  const [modalOpen, setModalOpen] = useState<null | { action: 'reset' | 'clear' }>(null)
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState<string | null>(null)
  const pwdRef = useRef<HTMLInputElement | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)

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

  async function resetHighscoresInner() {
    setResetOk(null)
    setError(null)
    setResetting(true)
    try {
      const res = await fetch('/api/highscores', { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to reset')
      setResetOk('Highscores reset')
      // Remount highscores table to re-fetch from server (now empty)
      setHighsKey(k => k + 1)
    } catch (e: any) {
      setError(e?.message || 'Failed to reset highscores')
    } finally {
      setResetting(false)
    }
  }

  async function clearPlayersInner() {
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

  function openConfirm(action: 'reset' | 'clear') {
    setPwd('')
    setPwdErr(null)
    setModalOpen({ action })
  }

  async function confirmAction() {
    if (pwd !== 'jayway') {
      setPwdErr('Wrong password')
      return
    }
    setPwdErr(null)
    const a = modalOpen?.action
    setModalOpen(null)
    if (a === 'reset') {
      await resetHighscoresInner()
    } else if (a === 'clear') {
      await clearPlayersInner()
    }
  }

  return (
    <div style={{ width: '100%', padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'stretch' }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Highscores</h2>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => openConfirm('reset')} disabled={resetting} style={{ padding: '10px 14px', fontWeight: 600 }}>
              {resetting ? 'Resetting…' : 'Reset Highscores'}
            </button>
            {resetOk && <span style={{ marginLeft: 12, color: '#16a34a' }}>{resetOk}</span>}
          </div>
          <HighscoreTable key={highsKey} showEmail showWhenEmpty />
        </div>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Players</h2>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => openConfirm('clear')} disabled={clearing} style={{ padding: '10px 14px', fontWeight: 600 }}>
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

      {modalOpen && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.stopPropagation(); setModalOpen(null); }
            if (e.key === 'Enter') { e.stopPropagation(); void confirmAction(); }
            if (e.key === 'Tab') {
              // minimal focus trap
              const focusables: (HTMLElement | null)[] = [pwdRef.current, confirmRef.current, cancelRef.current]
              const list = focusables.filter(Boolean) as HTMLElement[]
              if (list.length === 0) return
              const idx = list.indexOf(document.activeElement as HTMLElement)
              if (e.shiftKey) {
                if (idx <= 0) { e.preventDefault(); list[list.length - 1].focus(); }
              } else {
                if (idx === -1 || idx === list.length - 1) { e.preventDefault(); list[0].focus(); }
              }
            }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" className="panel" style={{ maxWidth: 420, width: '90%' }}>
            <h3 id="admin-confirm-title" style={{ marginTop: 0 }}>Confirm admin action</h3>
            <p style={{ marginTop: 0 }}>
              Type the admin password to {modalOpen.action === 'reset' ? 'reset all highscores' : 'clear all players'}.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Password"
                ref={pwdRef}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
              />
              <button ref={confirmRef} onClick={confirmAction} style={{ padding: '10px 14px', fontWeight: 700 }}>Confirm</button>
              <button ref={cancelRef} onClick={() => setModalOpen(null)} style={{ padding: '10px 14px' }}>Cancel</button>
            </div>
            {pwdErr && <div role="alert" style={{ color: '#b91c1c', marginTop: 8 }}>{pwdErr}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
