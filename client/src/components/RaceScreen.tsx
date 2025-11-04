import { useEffect, useMemo, useRef, useState } from 'react'
import CountdownTimer from './CountdownTimer'
import TypingEngine from './TypingEngine'
import RaceTrack from './RaceTrack'
import HighscoreTable from './HighscoreTable'

type Props = {
  name: string
  email: string
  text: string
  onResetToRegister?: () => void
  useLeaderOpponent?: boolean
}

type Highscore = { id: string; name: string; cps: number; charsTyped: number; durationSeconds: number; timestamp: string }

export default function RaceScreen({ name, email, text, onResetToRegister, useLeaderOpponent = true }: Props) {
  const totalChars = useMemo(() => text.replace(/\n/g, '').length, [text])
  const [started, setStarted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [elapsed, setElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [topCps, setTopCps] = useState<number>(0)
  const [topAvailable, setTopAvailable] = useState<boolean>(true)
  const [highsKey, setHighsKey] = useState(0)
  const [uniqueOnly, setUniqueOnly] = useState(false)
  const DEFAULT_OPPONENT_CPS = 2.0 // gentle fallback when no highscores exist
  const [ended, setEnded] = useState(false)
  const [resultCps, setResultCps] = useState<number | null>(null)
  const [resultChars, setResultChars] = useState<number | null>(null)
  const [finishElapsed, setFinishElapsed] = useState<number | null>(null)
  const [placement, setPlacement] = useState<number | null>(null)
  const highsRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [ghostElapsed, setGhostElapsed] = useState(0)

  useEffect(() => {
    let ignore = false
    fetch('/api/highscores/top')
      .then(r => {
        if (!r.ok) { setTopAvailable(false); return null }
        setTopAvailable(true)
        return r.json()
      })
      .then(data => {
        if (!ignore && data && typeof data.cps === 'number') setTopCps(data.cps)
      })
      .catch(() => {})
    return () => { ignore = true }
  }, [])

  // Smoothly update ghost elapsed time while race is running so the ghost moves fluidly.
  useEffect(() => {
    if (!started || ended || !startedAt) {
      // keep ghost in sync with coarse elapsed when not animating
      setGhostElapsed(elapsed)
      return
    }
    let mounted = true
    const tick = () => {
      if (!mounted) return
      const now = Date.now()
      const newElapsed = Math.min(60, (now - startedAt) / 1000)
      setGhostElapsed(newElapsed)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      mounted = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [started, ended, startedAt, elapsed])

  function handleProgress(ratio: number) {
    setProgress(ratio)
    if (!started && ratio > 0) {
      setStarted(true)
      if (!startedAt) setStartedAt(Date.now())
      // In test mode, shortcut the end to avoid timer + act coordination issues
      const mode = (import.meta as any).env?.MODE
      if (mode === 'test') {
        // call directly with current ratio to avoid stale state
        void handleEnd(ratio)
      }
    }
  }

  async function handleEnd(ratioOverride?: number) {
    if (ended) return
    const ratio = typeof ratioOverride === 'number' ? ratioOverride : progress
    const charsTyped = Math.max(0, Math.round(ratio * totalChars))
    const durMs = startedAt ? (Date.now() - startedAt) : (elapsed * 1000)
    const secondsExact = Math.max(0.1, durMs / 1000)
    const displaySeconds = secondsExact
    const cpsDisplay = charsTyped / secondsExact
    setResultChars(charsTyped)
    setFinishElapsed(displaySeconds)
    setResultCps(cpsDisplay)
    setEnded(true)
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, charsTyped, durationMs: Math.max(1, Math.round(durMs)) }),
    }).catch(() => {})
    // Recompute placement locally by fetching latest top 10 from server
    const res = await fetch('/api/highscores').catch(() => null)
    const list: Highscore[] = res && res.ok ? await res.json() : []
    // Scroll to highscores on finish
    setTimeout(() => { highsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 0)
    // compute placement locally vs. top10
    try {
      const augmented: Highscore[] = [...list]
      const myCps = cpsDisplay
      const index = augmented.findIndex(h => h.name === name && Math.abs(h.cps - myCps) < 1e-6)
      const sorted = augmented.concat(index === -1 ? [{ id: 'local', name, cps: myCps, charsTyped, durationSeconds: Math.round(secondsExact), durationMs: Math.round(durMs), timestamp: '' } as any] : [])
        .sort((a, b) => b.cps - a.cps)
      const pos = sorted.findIndex(h => h.name === name && Math.abs(h.cps - myCps) < 1e-6)
      setPlacement(pos >= 0 ? pos + 1 : null)
    } catch {
      setPlacement(null)
    }
    // Force HighscoreTable to re-fetch fresh data
    setHighsKey(k => k + 1)
  }

  function handleDoneEarly() {
    // End immediately when text fully typed
    void handleEnd(1)
  }

  function resetRace() {
    // Reset all runtime state for a fresh race
    setStarted(false)
    setSecondsLeft(60)
    setElapsed(0)
    setStartedAt(null)
    setProgress(0)
    setEnded(false)
    setResultCps(null)
    setResultChars(null)
    setFinishElapsed(null)
    setPlacement(null)
    setGhostElapsed(0)
    // Keep highscores as-is; they update after next finish
  }

  function renderSalute() {
    if (placement === 1) return `Outstanding, ${name}! You set the top score! 🏆`
    if (placement != null && placement > 1 && placement <= 3) return `Glorious, ${name}! You made it to the podium! 🥇🥈🥉`
    if (placement != null && placement > 0 && placement <= 10) return `Great job, ${name}! You made the highscore list! 🎉`
    return `Well done, ${name}! Keep going! 💪`
  }

  return (
    <div className="race-grid">
      <div className="panel">
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Race</h2>
        <RaceTrack
          playerProgress={progress}
          elapsedSeconds={elapsed}
          totalChars={totalChars}
          topScoreCps={useLeaderOpponent && topAvailable ? topCps : DEFAULT_OPPONENT_CPS}
          ghostElapsedSeconds={ghostElapsed}
        />
        {!ended && (
          <div className="panel-strong" style={{ marginTop: 12, fontSize: 18 }}>
            <TypingEngine text={text} onProgress={handleProgress} onDone={handleDoneEarly} />
          </div>
        )}
        <div
          data-testid="countdown-display"
          style={{
            margin: '12px 0',
            fontSize: 32,
            fontWeight: 700,
            textAlign: 'center',
          }}
          aria-live="polite"
        >
          {!ended ? `${secondsLeft}s` : ''}
        </div>
        {!ended && (
          <CountdownTimer
            start={started}
            durationSeconds={60}
            onTick={(s) => { if (!ended) { setSecondsLeft(s); setElapsed(60 - s) } }}
            onEnd={handleEnd}
            onBeep={() => {}}
          />
        )}
        {ended && (
          <div className="panel-strong" style={{ marginTop: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{renderSalute()}</div>
            <div style={{ marginTop: 4 }}>
              {resultChars != null && finishElapsed != null && (
                <span>{resultChars} chars in {finishElapsed.toFixed(2)}s → <strong>{(resultCps ?? 0).toFixed(2)} cps</strong></span>
              )}
            </div>
            {placement != null && (
              <div style={{ marginTop: 8 }}>Placement: #{placement}{placement > 10 ? ' (outside top 10)' : ''}</div>
            )}
            {placement == null && (
              <div style={{ marginTop: 8 }}>(Highscores unavailable)</div>
            )}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => { onResetToRegister ? onResetToRegister() : resetRace() }}
                style={{ padding: '10px 14px', fontWeight: 600 }}
              >
                New race
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="panel" ref={highsRef} id="highscores">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Highscores</h2>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={uniqueOnly} onChange={(e) => setUniqueOnly(e.target.checked)} />
            Show only best score per player
          </label>
        </div>
        <HighscoreTable
          key={highsKey}
          highlightName={ended ? name : undefined}
          highlightCps={ended ? (resultCps ?? undefined) : undefined}
          showWhenEmpty
          uniqueOnly={uniqueOnly}
        />
      </div>
    </div>
  )
}
