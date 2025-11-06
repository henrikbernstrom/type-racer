import { useEffect, useState } from 'react'

export type EventInfo = { id: string; name: string; description?: string; date?: string; createdAt: string; active?: boolean }

export default function AdminEvents() {
  const [events, setEvents] = useState<EventInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EventInfo | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [modalOpen, setModalOpen] = useState<null | { id: string }>(null)
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState<string | null>(null)

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
    const id = modalOpen?.id
    if (!id) return
    setPwdErr(null)
    setModalOpen(null)
    setPwd('')
    await deleteEvent(id)
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Events</h2>
      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {loading ? (<div>Loading…</div>) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Existing events</h3>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <div className="hs-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 240px', alignItems: 'center' }}>
                <div className="hs-cell" style={{ fontWeight: 700 }}>Name</div>
                <div className="hs-cell">Date</div>
                <div className="hs-cell">Active</div>
                <div className="hs-cell">Actions</div>
              </div>
              {events.map(ev => (
                <div key={ev.id} className="hs-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 240px', alignItems: 'center' }}>
                  <div className="hs-cell">{ev.name}</div>
                  <div className="hs-cell">{ev.date || '-'}</div>
                  <div className="hs-cell">{ev.active ? 'Yes' : 'No'}</div>
                  <div className="hs-cell" style={{ display: 'inline-flex', gap: 8 }}>
                    <button onClick={() => setEditing(ev)} style={{ padding: '8px 10px' }}>Edit</button>
                    <button onClick={() => activate(ev.id)} disabled={!!ev.active} style={{ padding: '8px 10px' }}>Activate</button>
                    <button onClick={() => setModalOpen({ id: ev.id })} disabled={ev.id === 'default'} title="Delete" style={{ padding: '8px 10px', background: '#ef4444', color: '#fff', border: '1px solid #dc2626', borderRadius: 6 }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
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
            {editing && (
              <div>
                <h3>Edit event</h3>
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
              </div>
            )}
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
