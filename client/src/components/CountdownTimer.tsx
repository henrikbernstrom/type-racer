import React, { useEffect, useRef } from 'react'

type Beep = { freq: number }

type Props = {
  start: boolean
  durationSeconds: number
  onTick?: (secondsLeft: number) => void
  onEnd?: () => void
  onBeep?: (b: Beep) => void
}

export default function CountdownTimer({ start, durationSeconds, onTick, onEnd, onBeep }: Props) {
  const secondsRef = useRef(durationSeconds)
  const startedRef = useRef(false)
  const intervalRef = useRef<number | null>(null)
  const tickRef = useRef(onTick)
  const endRef = useRef(onEnd)
  const beepRef = useRef(onBeep)

  // Keep latest callbacks without re-running the timer effect
  useEffect(() => { tickRef.current = onTick }, [onTick])
  useEffect(() => { endRef.current = onEnd }, [onEnd])
  useEffect(() => { beepRef.current = onBeep }, [onBeep])

  useEffect(() => {
    if (start && !startedRef.current) {
      // initialize only once when starting
      secondsRef.current = durationSeconds
      startedRef.current = true
      tickRef.current?.(secondsRef.current)
      intervalRef.current = window.setInterval(() => {
        secondsRef.current -= 1
        const s = secondsRef.current
        tickRef.current?.(s)
        if (s === 3 || s === 2 || s === 1) {
          beepRef.current?.({ freq: 440 })
        }
        if (s === 0) {
          beepRef.current?.({ freq: 880 })
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          endRef.current?.()
        }
      }, 1000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [start, durationSeconds])

  return null
}
