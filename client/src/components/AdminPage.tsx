import { useEffect, useRef, useState } from 'react'
import HighscoreTable from './HighscoreTable'
import AdminEvents from './AdminEvents'

type Player = { id: string; name: string; email: string; createdAt: string }

export default function AdminPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [eventId, setEventId] = useState<string>('default')
  const [activeEventName, setActiveEventName] = useState<string>('Default')
  const [tab, setTab] = useState<'data' | 'events'>('data')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [highsKey, setHighsKey] = useState(0)
  const [modalOpen, setModalOpen] = useState<null | { action: 'deleteHighs' | 'deletePlayers' }>(null)
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState<string | null>(null)
  const pwdRef = useRef<HTMLInputElement | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const [selectedHighIds, setSelectedHighIds] = useState<string[]>([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const playerHeaderChk = useRef<HTMLInputElement | null>(null)

  // Load active event
  useEffect(() => {
    let ignore = false
    fetch('/api/events/active')
      .then(r => (r.ok ? r.json() : null))
      .then((ev) => { if (!ignore && ev) { setEventId(ev.id); setActiveEventName(ev.name || 'Default') } })
      .catch(() => {})
    return () => { ignore = true }
  }, [])

  // Live updates for active event
  useEffect(() => {
    const es = new EventSource('/api/events/active/stream')
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data)
        if (ev && ev.id) { setEventId(ev.id); setActiveEventName(ev.name || 'Default') }
      } catch {}
    }
    return () => { es.close() }
  }, [])

  // Immediate updates when events page activates an event
  useEffect(() => {
    const onImmediateUpdate = (e: Event) => {
      const ce = e as CustomEvent<any>
      const ev = ce.detail
      if (ev && ev.id) {
        setEventId(ev.id)
        setActiveEventName(ev.name || 'Default')
      }
    }
    window.addEventListener('active-event-updated', onImmediateUpdate)
    return () => window.removeEventListener('active-event-updated', onImmediateUpdate)
  }, [])

  // Load players for selected event
  useEffect(() => {
    let ignore = false
    setLoading(true)
    const qs = new URLSearchParams()
    if (eventId) qs.set('eventId', eventId)
    fetch(`/api/players?${qs.toString()}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((arr: Player[]) => { if (!ignore) { setPlayers(arr || []) } })
      .catch((e) => { if (!ignore) setError(e.message || 'Failed to load players') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [eventId])

  // Clear player selection when list changes
  useEffect(() => {
    setSelectedPlayerIds(new Set())
  }, [players])

  // Update indeterminate state for players header checkbox
  useEffect(() => {
    if (playerHeaderChk.current) {
      playerHeaderChk.current.indeterminate = selectedPlayerIds.size > 0 && selectedPlayerIds.size < players.length
    }
  }, [selectedPlayerIds, players.length])

  async function deleteSelectedHighscores() {
    if (selectedHighIds.length === 0) return
    try {
      setError(null)
      const qs = new URLSearchParams(); if (eventId) qs.set('eventId', eventId)
      const res = await fetch(`/api/highscores/batch?${qs.toString()}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedHighIds }),
      })
      if (!res.ok) throw new Error('Failed to delete selected highscores')
      setSelectedHighIds([])
      // Remount highscores table to re-fetch updated data
      setHighsKey(k => k + 1)
    } catch (e: any) {
      setError(e?.message || 'Failed to delete selected highscores')
    }
  }

  async function deleteSelectedPlayers() {
    if (selectedPlayerIds.size === 0) return
    try {
      setError(null)
      const ids = Array.from(selectedPlayerIds)
      const qs = new URLSearchParams(); if (eventId) qs.set('eventId', eventId)
      const res = await fetch(`/api/players/batch?${qs.toString()}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed to delete selected players')
      // Optimistically update local list
      setPlayers(prev => prev.filter(p => !ids.includes(p.id)))
      setSelectedPlayerIds(new Set())
    } catch (e: any) {
      setError(e?.message || 'Failed to delete selected players')
    }
  }

  function openConfirm(action: 'deleteHighs' | 'deletePlayers') {
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
    if (a === 'deleteHighs') {
      await deleteSelectedHighscores()
    } else if (a === 'deletePlayers') {
      await deleteSelectedPlayers()
    }
  }

  return (
    <div style={{ width: '98%', padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12 }}>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <button onClick={() => setTab('data')} aria-pressed={tab==='data'} style={{ padding: '8px 12px', fontWeight: 600, border: tab==='data' ? '2px solid #646cff' : undefined }}>Data</button>
            <button onClick={() => setTab('events')} aria-pressed={tab==='events'} style={{ padding: '8px 12px', fontWeight: 600, border: tab==='events' ? '2px solid #646cff' : undefined }}>Events</button>
          </div>
          <div style={{ fontWeight: 600, paddingLeft: 16 }}>Active event - {activeEventName}</div>
        </div>
        {tab === 'events' ? (
          <AdminEvents />
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Highscores</h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <button
                  aria-label="Delete selected highscores"
                  title="Delete selected"
                  disabled={selectedHighIds.length === 0}
                  style={{ padding: '8px', background: '#ef4444', color: '#fff', border: '1px solid #dc2626', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => openConfirm('deleteHighs')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <HighscoreTable key={highsKey} showEmail showWhenEmpty onSelectionChange={setSelectedHighIds} eventId={eventId} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 12px' }}>
              <h2 style={{ margin: 0 }}>Players</h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <button
                  aria-label="Delete selected players"
                  title="Delete selected"
                  disabled={selectedPlayerIds.size === 0}
                  style={{ padding: '8px', background: '#ef4444', color: '#fff', border: '1px solid #dc2626', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => openConfirm('deletePlayers')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            {loading && <div>Loading…</div>}
            {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
            {!loading && !error && (
              <div className="hs-table hs--2sel" role="table">
                <div className="hs-header" role="row">
                  <div className="hs-cell" role="columnheader">Email</div>
                  <div className="hs-cell" role="columnheader">Created</div>
                  <div className="hs-cell" role="columnheader">
                    <input
                      ref={playerHeaderChk}
                      type="checkbox"
                      aria-label="Select all players"
                      checked={selectedPlayerIds.size > 0 && selectedPlayerIds.size === players.length}
                      onChange={(e) => {
                        const next = new Set<string>()
                        if (e.target.checked) {
                          for (const p of players) next.add(p.id)
                        }
                        setSelectedPlayerIds(next)
                      }}
                    />
                  </div>
                </div>
                {[...players]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((p, idx) => (
                  <div key={p.id} className="hs-row" role="row">
                    <div className="hs-cell" role="cell">{p.email}</div>
                    <div className="hs-cell" role="cell">{new Date(p.createdAt).toLocaleString()}</div>
                    <div className="hs-cell" role="cell">
                      <input
                        type="checkbox"
                        aria-label={`Select player ${idx + 1}`}
                        checked={selectedPlayerIds.has(p.id)}
                        onChange={(e) => {
                          const next = new Set(selectedPlayerIds)
                          if (e.target.checked) next.add(p.id); else next.delete(p.id)
                          setSelectedPlayerIds(next)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
              Type the admin password to {modalOpen.action === 'deleteHighs'
                ? 'delete selected highscores'
                : 'delete selected players'}.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4 }}
                ref={pwdRef}
                placeholder="Admin password"
                aria-label="Admin password"
              />
              <button ref={confirmRef} onClick={() => void confirmAction()} style={{ padding: '10px 14px', fontWeight: 600 }}>Confirm</button>
              <button ref={cancelRef} onClick={() => setModalOpen(null)} style={{ padding: '10px 14px' }}>Cancel</button>
            </div>
            {pwdErr && <div role="alert" style={{ color: '#b91c1c', marginTop: 8 }}>{pwdErr}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
