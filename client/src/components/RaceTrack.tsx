import React from 'react'

type Props = {
  playerProgress: number // 0..1
  elapsedSeconds: number
  totalChars: number
  topScoreCps?: number
  ghostElapsedSeconds?: number
  started?: boolean
}

export default function RaceTrack({ playerProgress, elapsedSeconds, totalChars, topScoreCps, ghostElapsedSeconds, started }: Props) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n))
  const player = clamp(playerProgress)
  const ghostElapsed = ghostElapsedSeconds ?? elapsedSeconds
  const ghost = topScoreCps != null ? clamp((topScoreCps * ghostElapsed) / Math.max(1, totalChars)) : null
  const ghostDurationSec = topScoreCps ? Math.max(0.1, totalChars / Math.max(0.1, topScoreCps)) : null

  const diffChars = ghost != null ? Math.round((player - ghost) * totalChars) : 0
  const indicator = ghost == null ? '' : diffChars >= 0 ? `+${diffChars}` : `${diffChars}`

  return (
    <div data-testid="track" style={{ position: 'relative', width: '100%', height: 64, background: '#eee', borderRadius: 8 }}>
      {ghost != null && ghostDurationSec != null && (
        <div
          data-testid="car-ghost"
          className="ghost-car"
          style={{
            animationName: 'hs-ghost-move',
            animationDuration: `${ghostDurationSec}s`,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
            // negative delay syncs animation timeline to current elapsed
            animationDelay: started ? `-${ghostElapsed}s` : '0s',
            animationPlayState: started ? 'running' : 'paused',
            willChange: 'left',
            '--pos': String(ghost),
          } as React.CSSProperties}
        >
          🚗
        </div>
      )}
      <div
        data-testid="car-player"
        style={{
          position: 'absolute',
          left: `${player * 100}%`,
          top: 0,
          transform: 'translateX(-50%)',
          transition: 'left 120ms ease-out',
          willChange: 'left',
          '--pos': String(player),
        } as React.CSSProperties}
      >
        🏎️
      </div>
      <div data-testid="ahead-behind" style={{ position: 'absolute', right: 8, top: 8, fontWeight: 600 }}>
        {indicator}
      </div>
    </div>
  )
}
