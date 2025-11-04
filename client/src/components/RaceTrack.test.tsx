import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RaceTrack from './RaceTrack'

function getPos(el: HTMLElement) {
  const style = el.getAttribute('style') || ''
  const m = /--pos:([^;]+)/.exec(style)
  return m ? parseFloat(m[1]) : 0
}

describe('RaceTrack', () => {
  test('positions player and ghost; ghost is opaque and ahead/behind indicator works', () => {
    render(
      <RaceTrack
        playerProgress={0.4}
        elapsedSeconds={10}
        topScoreCps={5}
        totalChars={600}
      />
    )

    const player = screen.getByTestId('car-player')
    const ghost = screen.getByTestId('car-ghost')
    const indicator = screen.getByTestId('ahead-behind')

    expect(getPos(player)).toBeCloseTo(0.4, 3)

    // ghost position = min(1, cps_top * t / totalChars) = 5*10/600 = 0.0833
    expect(getPos(ghost)).toBeCloseTo(5 * 10 / 600, 3)

    // player ahead -> indicator should include '+'
    expect(indicator.textContent).toMatch(/\+/)
  })

  test('hides ghost when no top score', () => {
    render(<RaceTrack playerProgress={0.1} elapsedSeconds={2} totalChars={200} />)
    expect(screen.queryByTestId('car-ghost')).toBeNull()
  })
})
