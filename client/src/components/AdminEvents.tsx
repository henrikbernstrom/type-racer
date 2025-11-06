import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export type EventInfo = { id: string; name: string; description?: string; date?: string; createdAt: string; active?: boolean }

export default function AdminEvents() {
  const [events, setEvents] = useState<EventInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EventInfo | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [modalOpen, setModalOpen] = useState<null | { ids: string[] }>(null)
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const headerChk = useRef<HTMLInputElement | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/events')
      const list = res.ok ? await res.json() : []
      setEvents(list || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // Clear selection when list changes; update header indeterminate when selection updates
  useEffect(() => {
    setSelectedIds(new Set())
  }, [events])

  useEffect(() => {
    if (headerChk.current) {
      const eligibleCount = events.filter(e => e.id !== 'default' && !e.active).length
      headerChk.current.indeterminate = selectedIds.size > 0 && selectedIds.size < eligibleCount
    }
  }, [selectedIds, events])

  // ESC cancels editing (unless delete modal is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editing && !modalOpen) {
        e.stopPropagation();
        setEditing(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, modalOpen])

  async function createEvent() {
    try {
      setError(null)
      const body: any = { name }
      if (description.trim()) body.description = description.trim()
      if (date) body.date = date
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to create event')
      setName(''); setDescription(''); setDate('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to create event')
    }
  }

  async function updateEvent() {
    if (!editing) return
    try {
      setError(null)
      const body: any = {}
      if (editing.name.trim()) body.name = editing.name.trim()
      body.description = editing.description || ''
      body.date = editing.date || ''
      const res = await fetch(`/api/events/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to update event')
      setEditing(null)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to update event')
    }
  }

  async function activate(id: string) {
    try {
      setError(null)
      const res = await fetch(`/api/events/${id}/activate`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to activate event')
      // Immediately broadcast the newly active event so other admin views can update without waiting for SSE or reload
      const ev = events.find(e => e.id === id)
      if (ev) {
        window.dispatchEvent(new CustomEvent('active-event-updated', { detail: { id: ev.id, name: ev.name } }))
      }
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to activate event')
    }
  }

  async function deleteEvent(id: string) {
    try {
      setError(null)
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        throw new Error(msg || 'Failed to delete event')
      }
      if (editing?.id === id) setEditing(null)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete event')
    }
  }

  async function confirmDelete() {
    if (pwd !== 'jayway') { setPwdErr('Wrong password'); return }
    const ids = modalOpen?.ids || []
    if (ids.length === 0) return
    setPwdErr(null)
    setModalOpen(null)
    setPwd('')
    // Delete sequentially to keep server operations simple
    for (const id of ids) {
      const ev = events.find(e => e.id === id)
      // skip default or active just in case
      if (!ev || ev.id === 'default' || ev.active) continue
      await deleteEvent(id)
    }
    setSelectedIds(new Set())
    await load()
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Events</h2>
      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {loading ? (<div>Loading…</div>) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Existing events</h3>
              <button
                onClick={() => setModalOpen({ ids: Array.from(selectedIds).filter(id => {
                  const ev = events.find(e => e.id === id)
                  return !!ev && !ev.active && ev.id !== 'default'
                }) })}
                disabled={Array.from(selectedIds).filter(id => {
                  const ev = events.find(e => e.id === id)
                  return !!ev && !ev.active && ev.id !== 'default'
                }).length === 0}
                title="Delete selected"
                aria-label="Delete selected events"
                style={{ padding: '8px', background: '#ef4444', color: '#fff', border: '1px solid #dc2626', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <div className="hs-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 180px 44px', alignItems: 'center' }}>
                <div className="hs-cell" style={{ fontWeight: 700, textAlign: 'left' }}>Name</div>
                <div className="hs-cell" style={{ textAlign: 'left' }}>Date</div>
                <div className="hs-cell" style={{ textAlign: 'center' }}>Active</div>
                <div className="hs-cell" style={{ justifySelf: 'end' }}>Actions</div>
                <div className="hs-cell" role="columnheader" style={{ textAlign: 'center' }}>
                  <input
                    ref={headerChk}
                    type="checkbox"
                    aria-label="Select all events"
                    checked={(() => { const eligible = events.filter(e => e.id !== 'default' && !e.active).length; return selectedIds.size > 0 && selectedIds.size === eligible })()}
                    onChange={(e) => {
                      const next = new Set<string>()
                      if (e.target.checked) {
                        for (const ev of events) { if (ev.id !== 'default' && !ev.active) next.add(ev.id) }
                      }
                      setSelectedIds(next)
                    }}
                  />
                </div>
              </div>
              {events.map(ev => (
                <div key={ev.id} className="hs-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 180px 44px', alignItems: 'center' }}>
                  <div className="hs-cell" style={{ textAlign: 'left' }}>{ev.name}</div>
                  <div className="hs-cell" style={{ textAlign: 'left' }}>{ev.date || '-'}</div>
                  <div className="hs-cell" style={{ textAlign: 'center' }}>{ev.active ? 'Yes' : 'No'}</div>
                  <div className="hs-cell" style={{ display: 'inline-flex', gap: 8, justifySelf: 'end' }}>
                    <button onClick={() => setEditing(ev)} style={{ padding: '8px 10px' }}>Edit</button>
                    <button onClick={() => activate(ev.id)} disabled={!!ev.active} style={{ padding: '8px 10px' }}>Activate</button>
                  </div>
                  <div className="hs-cell" role="cell" style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label={`Select event ${ev.name}`}
                      disabled={ev.id === 'default' || !!ev.active}
                      checked={selectedIds.has(ev.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds)
                        if (e.target.checked) next.add(ev.id); else next.delete(ev.id)
                        setSelectedIds(next)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <AnimatePresence mode="popLayout" initial={false}>
              {!editing && (
                <motion.div
                  key="create"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <h3 style={{ marginTop: 0 }}>Create event</h3>
                  <div className="panel" style={{ padding: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4, minHeight: 96 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4 }}
                      />
                    </div>
                    <button onClick={createEvent} disabled={!name.trim()} style={{ padding: '10px 14px', fontWeight: 600 }}>Create</button>
                  </div>
                </motion.div>
              )}
              {editing && (
                <motion.div
                  key="edit"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div style={{ marginBottom: 8, color: '#6b7280', fontStyle: 'italic' }}>Create event — Visible when editing event is done</div>
                  <h3 style={{ marginTop: 0 }}>Edit event</h3>
                  <div className="panel" style={{ padding: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name</label>
                      <input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
                      <textarea
                        value={editing.description || ''}
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4, minHeight: 96 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Date</label>
                      <input
                        type="date"
                        value={editing.date || ''}
                        onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={updateEvent} style={{ padding: '10px 14px', fontWeight: 600 }}>Save</button>
                      <button onClick={() => setEditing(null)} style={{ padding: '10px 14px' }}>Cancel</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
      {modalOpen && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.stopPropagation(); setModalOpen(null) }
            if (e.key === 'Enter') { e.stopPropagation(); void confirmDelete() }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="events-confirm-title" className="panel" style={{ maxWidth: 420, width: '90%' }}>
            <h3 id="events-confirm-title" style={{ marginTop: 0 }}>Confirm delete event</h3>
            <p style={{ marginTop: 0 }}>Type the admin password to delete this event and all of its data.</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4 }}
                placeholder="Admin password"
                aria-label="Admin password"
              />
              <button onClick={() => void confirmDelete()} style={{ padding: '10px 14px', fontWeight: 600 }}>Confirm</button>
              <button onClick={() => setModalOpen(null)} style={{ padding: '10px 14px' }}>Cancel</button>
            </div>
            {pwdErr && <div role="alert" style={{ color: '#b91c1c', marginTop: 8 }}>{pwdErr}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
