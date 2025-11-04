import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import CountdownTimer from './CountdownTimer'

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('counts down from 60, emits ticks, and beeps at 3,2,1,0 with last octave higher', () => {
    const onTick = vi.fn()
    const onEnd = vi.fn()
    const onBeep = vi.fn()

    render(<CountdownTimer start durationSeconds={60} onTick={onTick} onEnd={onEnd} onBeep={onBeep} />)

    // initial tick at 60
    expect(onTick).toHaveBeenLastCalledWith(60)

    // fast-forward to last 4 seconds
    advance(56_000)
    expect(onTick).toHaveBeenLastCalledWith(4)

    advance(1_000)
    expect(onTick).toHaveBeenLastCalledWith(3)
    expect(onBeep).toHaveBeenLastCalledWith(expect.objectContaining({ freq: 440 }))

    advance(1_000)
    expect(onTick).toHaveBeenLastCalledWith(2)
    expect(onBeep).toHaveBeenLastCalledWith(expect.objectContaining({ freq: 440 }))

    advance(1_000)
    expect(onTick).toHaveBeenLastCalledWith(1)
    expect(onBeep).toHaveBeenLastCalledWith(expect.objectContaining({ freq: 440 }))

    advance(1_000)
    expect(onTick).toHaveBeenLastCalledWith(0)
    // last beep one octave higher (880hz)
    expect(onBeep).toHaveBeenLastCalledWith(expect.objectContaining({ freq: 880 }))
    expect(onEnd).toHaveBeenCalled()
  })
})
