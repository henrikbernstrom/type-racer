import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import RaceScreen from './RaceScreen'

import { server } from '../test/server'

const sampleText = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

function useApiMocks() {
  let posted: any = null
  server.use(
    http.get('/api/highscores/top', () => {
      return HttpResponse.json({ id: 't1', name: 'Top', cps: 6, charsTyped: 360, durationSeconds: 60, timestamp: new Date().toISOString() })
    }),
    http.post('/api/scores', async ({ request }) => {
      posted = await request.json()
      return HttpResponse.json({ id: 'x', ...posted, cps: posted.charsTyped / posted.durationSeconds, timestamp: new Date().toISOString() }, { status: 201 })
    }),
    http.get('/api/highscores', () => {
      return HttpResponse.json([
        { id: 'x', name: 'Alice', cps: 5, charsTyped: 300, durationSeconds: 60, timestamp: new Date().toISOString() },
      ])
    })
  )
  return { getPosted: () => posted }
}

describe('RaceScreen', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('starts on typing, submits score at end, shows highscores and ghost', async () => {
    const { getPosted } = useApiMocks()
    render(<RaceScreen name="Alice" email="alice@example.com" text={sampleText} />)

    // Ghost visible
    expect(await screen.findByTestId('car-ghost')).toBeTruthy()

    const input = screen.getByRole('textbox', { name: /typing-input/i })
    await userEvent.type(input, 'lorem ')

    // wait for async effects
    await Promise.resolve()

    // highscore list visible with Alice
    expect(await screen.findByTestId('highscore-list')).toBeTruthy()

    const posted = getPosted()
    expect(posted).toBeTruthy()
    expect(posted.durationSeconds).toBe(60)
    expect(posted.name).toBe('Alice')
    expect(posted.charsTyped).toBeGreaterThan(0)
  })
})
