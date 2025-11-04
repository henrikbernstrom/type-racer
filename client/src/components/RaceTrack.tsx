import React from 'react'

type Props = {
  playerProgress: number // 0..1
  elapsedSeconds: number
  totalChars: number
  topScoreCps?: number
  ghostElapsedSeconds?: number
}

export default function RaceTrack({ playerProgress, elapsedSeconds, totalChars, topScoreCps, ghostElapsedSeconds }: Props) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n))
  const player = clamp(playerProgress)
  const ghostElapsed = ghostElapsedSeconds ?? elapsedSeconds
  const ghost = topScoreCps != null ? clamp((topScoreCps * ghostElapsed) / Math.max(1, totalChars)) : null

  const diffChars = ghost != null ? Math.round((player - ghost) * totalChars) : 0
  const indicator = ghost == null ? '' : diffChars >= 0 ? `+${diffChars}` : `${diffChars}`

  return (
    <div data-testid="track" style={{ position: 'relative', width: '100%', height: 64, background: '#eee', borderRadius: 8 }}>
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          top: 32,
          height: 0,
          borderTop: '2px dotted #cbd5e1',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: 6,
          transform: 'translateX(-50%)',
          fontSize: 12,
          letterSpacing: '0.08em',
          color: '#64748b',
          fontWeight: 600,
          zIndex: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        YOU
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: 46,
          transform: 'translateX(-50%)',
          fontSize: 12,
          letterSpacing: '0.08em',
          color: '#64748b',
          fontWeight: 600,
          zIndex: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        LEADER
      </div>
      {ghost != null && (
        <div
          data-testid="car-ghost"
          style={{
            position: 'absolute',
            left: `${ghost * 100}%`,
            top: 24,
            opacity: 0.5,
            transform: 'translateX(-50%) scaleX(-1)',
            willChange: 'left',
            fontSize: '2em',
            zIndex: 2,
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
          top: -6,
          transform: 'translateX(-50%) scaleX(-1)',
          transition: 'left 120ms ease-out',
          willChange: 'left',
          fontSize: '2em',
          zIndex: 2,
          '--pos': String(player),
        } as React.CSSProperties}
      >
        🏎️
      </div>
      <div
        data-testid="ahead-behind"
        style={{
          position: 'absolute',
          right: 8,
          top: -20,
          fontWeight: 700,
          color: '#111827',
          zIndex: 3,
        }}
      >
        {ghost != null && (
          <span style={{ fontSize: 12, opacity: 0.8, marginRight: 6 }}>Ahead/Behind:</span>
        )}
        {indicator && `${indicator} chars`}
      </div>
    </div>
  )
}
