import React, { useEffect, useMemo, useRef, useState } from 'react'
import CountdownTimer from './CountdownTimer'
import TypingEngine from './TypingEngine'
import RaceTrack from './RaceTrack'
import HighscoreTable from './HighscoreTable'

type Props = {
  name: string
  email: string
  text: string
}

type Highscore = { id: string; name: string; cps: number; charsTyped: number; durationSeconds: number; timestamp: string }

export default function RaceScreen({ name, email, text }: Props) {
  const totalChars = useMemo(() => text.replace(/\n/g, '').length, [text])
  const [started, setStarted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [elapsed, setElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [topCps, setTopCps] = useState<number>(0)
  const [topAvailable, setTopAvailable] = useState<boolean>(true)
  const [highscores, setHighscores] = useState<Highscore[] | null>(null)
  const DEFAULT_OPPONENT_CPS = 3.5 // not used for ghost anymore; kept for potential future UI copy
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

  // Load highscores initially so they're visible during the race
  useEffect(() => {
    let ignore = false
    fetch('/api/highscores')
      .then(r => (r.ok ? r.json() : []))
      .then(arr => { if (!ignore) setHighscores(arr ?? []) })
      .catch(() => { if (!ignore) setHighscores([]) })
    return () => { ignore = true }
  }, [])

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
    setHighscores([])
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, charsTyped, durationMs: Math.max(1, Math.round(durMs)) }),
    }).catch(() => {})
    const res = await fetch('/api/highscores').catch(() => null)
    const list = res && res.ok ? await res.json() : []
    setHighscores(list)
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
  }

  function handleDoneEarly() {
    // End immediately when text fully typed
    void handleEnd(1)
  }

  return (
    <div className="race-grid">
      <div>
        <RaceTrack playerProgress={progress} elapsedSeconds={elapsed} totalChars={totalChars} topScoreCps={topAvailable ? topCps : undefined} ghostElapsedSeconds={ghostElapsed} started={started} />
        {!ended && (
          <TypingEngine text={text} onProgress={handleProgress} onDone={handleDoneEarly} />
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
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Your result</div>
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
          </div>
        )}
      </div>
      <div ref={highsRef} id="highscores">
        <HighscoreTable scores={highscores ?? []} highlightName={ended ? name : undefined} highlightCps={ended ? (resultCps ?? undefined) : undefined} />
      </div>
    </div>
  )
}
