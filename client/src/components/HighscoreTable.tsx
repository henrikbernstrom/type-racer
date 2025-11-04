import { useEffect, useState } from 'react'

export type Highscore = { id: string; name: string; cps: number; charsTyped: number; durationSeconds: number; durationMs?: number; timestamp: string }

type Props = {
  scores?: Highscore[] | null
  highlightName?: string
  highlightCps?: number
  showEmail?: boolean
}

export default function HighscoreTable({ scores, highlightName, highlightCps, showEmail }: Props) {
  const [list, setList] = useState<Highscore[]>([])

  useEffect(() => {
    let ignore = false
    if (!scores) {
      fetch('/api/highscores')
        .then(r => (r.ok ? r.json() : []))
        .then((arr) => { if (!ignore) setList(arr ?? []) })
        .catch(() => { if (!ignore) setList([]) })
    } else if (Array.isArray(scores)) {
      setList(scores)
    } else {
      setList([])
    }
    return () => { ignore = true }
  }, [scores])

  if (!list || list.length === 0) return null

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ overflowX: 'auto' }}>
        <div data-testid="highscore-list" role="table" className={`hs-table ${showEmail ? 'hs--6' : 'hs--5'}`}>
          <div role="row" className="hs-header">
            <div role="columnheader" className="hs-cell">#</div>
            <div role="columnheader" className="hs-cell">Name</div>
            {showEmail && <div role="columnheader" className="hs-cell">Email</div>}
            <div role="columnheader" className="hs-cell hs-right">CPS</div>
            <div role="columnheader" className="hs-cell hs-right">Chars</div>
            <div role="columnheader" className="hs-cell">Date</div>
          </div>
          {list.map((h, i) => {
            const seconds = typeof h.durationMs === 'number' ? (h.durationMs / 1000) : (h.durationSeconds || 1)
            const rowCps = h.charsTyped && seconds ? (h.charsTyped / Math.max(0.1, seconds)) : h.cps
            const isMe = highlightName && Math.abs((highlightCps ?? rowCps) - rowCps) < 1e-6 && h.name === highlightName
            return (
              <div role="row" key={h.id} className={`hs-row${isMe ? ' hs-me' : ''}`}>
                <div role="cell" className="hs-cell">{i + 1}</div>
                <div role="cell" className="hs-cell">{h.name}</div>
                {showEmail && <div role="cell" className="hs-cell">{(h as any).email ?? ''}</div>}
                <div role="cell" className="hs-cell hs-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{rowCps.toFixed(2)}</div>
                <div role="cell" className="hs-cell hs-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{h.charsTyped}</div>
                <div role="cell" className="hs-cell">{new Date(h.timestamp).toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
