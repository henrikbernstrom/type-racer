import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TypingEngine from './TypingEngine'

const sampleText = 'alpha beta gamma\ndelta epsilon zeta\neta theta iota'

function setup() {
  const onProgress = vi.fn()
  const onDone = vi.fn()
  render(<TypingEngine text={sampleText} onProgress={onProgress} onDone={onDone} />)
  const input = screen.getByRole('textbox')
  return { input, onProgress, onDone }
}

describe('TypingEngine', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('renders two lines and highlights per-char correctness, clears on word completion', async () => {
    const { input } = setup()

    // Two lines visible
    expect(screen.getAllByTestId('line').length).toBe(2)

    await userEvent.type(input, 'alpha')
    // All 5 chars should be marked correct in first line
    const correct = screen.getAllByTestId('char-correct')
    expect(correct.length).toBeGreaterThanOrEqual(5)

    // space finalizes word and clears its highlights
    await userEvent.type(input, ' ')
    expect(screen.queryAllByTestId('char-correct').length).toBe(0)
  })

  test('scrolls to next line when finishing a line', async () => {
    const { input } = setup()

    await userEvent.type(input, 'alpha beta gamma ')
    // After completing first line words + trailing space, next line should appear as second line
    const lines = screen.getAllByTestId('line')
    expect(lines[0].textContent).toBe('delta epsilon zeta')
  })
})
