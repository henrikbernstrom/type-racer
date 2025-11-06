import { useEffect, useRef, useState } from 'react'

export type Highscore = { id: string; name: string; cps: number; charsTyped: number; durationSeconds: number; durationMs?: number; timestamp: string }

type Props = {
  scores?: Highscore[] | null
  highlightName?: string
  highlightCps?: number
  showEmail?: boolean
  showWhenEmpty?: boolean
  uniqueOnly?: boolean
  onSelectionChange?: (ids: string[]) => void
  eventId?: string
}

export default function HighscoreTable({ scores, highlightName, highlightCps, showEmail, showWhenEmpty, uniqueOnly, onSelectionChange, eventId }: Props) {
  const [list, setList] = useState<Highscore[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const headerChk = useRef<HTMLInputElement | null>(null)
  const selectable = typeof onSelectionChange === 'function'

  useEffect(() => {
    let ignore = false
    if (!scores) {
      const qs = new URLSearchParams()
      qs.set('limit', '10')
      if (uniqueOnly) qs.set('uniqueEmail', '1')
      if (eventId) qs.set('eventId', eventId)
      fetch(`/api/highscores?${qs.toString()}`)
        .then(r => (r.ok ? r.json() : []))
        .then((arr) => { if (!ignore) setList(arr ?? []) })
        .catch(() => { if (!ignore) setList([]) })
    } else if (Array.isArray(scores)) {
      setList(scores)
    } else {
      setList([])
    }
    return () => { ignore = true }
  }, [scores, uniqueOnly, eventId])

  // Clear selection when list changes
  useEffect(() => {
    setSelected(new Set())
  }, [list])

  // Update indeterminate state and notify parent on selection change
  useEffect(() => {
    if (headerChk.current) {
      headerChk.current.indeterminate = selected.size > 0 && selected.size < list.length
    }
    onSelectionChange?.(Array.from(selected))
  }, [selected, list.length, onSelectionChange])

  const empty = !list || list.length === 0
  if (empty && !showWhenEmpty) return null

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ overflowX: 'auto' }}>
        <div data-testid="highscore-list" role="table" className={`hs-table ${showEmail ? (selectable ? 'hs--7sel' : 'hs--7') : (selectable ? 'hs--6sel' : 'hs--6')}`}>
          <div role="row" className="hs-header">
            <div role="columnheader" className="hs-cell">#</div>
            <div role="columnheader" className="hs-cell">Name</div>
            {showEmail && <div role="columnheader" className="hs-cell">Email</div>}
            <div role="columnheader" className="hs-cell hs-right">CPS</div>
            <div role="columnheader" className="hs-cell hs-right">Time</div>
            <div role="columnheader" className="hs-cell hs-right">Chars</div>
            <div role="columnheader" className="hs-cell">Date</div>
            {selectable && (
              <div role="columnheader" className="hs-cell">
                <input
                  ref={headerChk}
                  type="checkbox"
                  aria-label="Select all highscores"
                  checked={selected.size > 0 && selected.size === list.length}
                  onChange={(e) => {
                    const next = new Set<string>()
                    if (e.target.checked) {
                      for (const h of list) next.add(h.id)
                    }
                    setSelected(next)
                  }}
                />
              </div>
            )}
          </div>
          {!empty && list.map((h, i) => {
            const seconds = typeof h.durationMs === 'number' ? (h.durationMs / 1000) : (h.durationSeconds || 1)
            const rowCps = h.charsTyped && seconds ? (h.charsTyped / Math.max(0.1, seconds)) : h.cps
            const timeText = `${seconds.toFixed(2).replace('.', ',')} sec`
            const date = new Date(h.timestamp)
            const y = date.getFullYear()
            const mo = String(date.getMonth() + 1).padStart(2, '0')
            const da = String(date.getDate()).padStart(2, '0')
            const hh = String(date.getHours()).padStart(2, '0')
            const mm = String(date.getMinutes()).padStart(2, '0')
            const dateText = `${y}-${mo}-${da} ${hh}:${mm}`
            const isMe = highlightName && Math.abs((highlightCps ?? rowCps) - rowCps) < 1e-6 && h.name === highlightName
            return (
              <div role="row" key={h.id} className={`hs-row${isMe ? ' hs-me' : ''}`}>
                <div role="cell" className="hs-cell">{i + 1}</div>
                <div role="cell" className="hs-cell">{h.name}</div>
                {showEmail && <div role="cell" className="hs-cell">{(h as any).email ?? ''}</div>}
                <div role="cell" className="hs-cell hs-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{rowCps.toFixed(2)}</div>
                <div role="cell" className="hs-cell hs-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{timeText}</div>
                <div role="cell" className="hs-cell hs-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{h.charsTyped}</div>
                <div role="cell" className="hs-cell" style={{ fontVariantNumeric: 'tabular-nums' }}>{dateText}</div>
                {selectable && (
                  <div role="cell" className="hs-cell">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${i + 1}`}
                      checked={selected.has(h.id)}
                      onChange={(e) => {
                        const next = new Set(selected)
                        if (e.target.checked) next.add(h.id); else next.delete(h.id)
                        setSelected(next)
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
