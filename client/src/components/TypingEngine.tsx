import React, { useMemo, useState } from 'react'

type Props = {
  text: string
  onProgress?: (ratio: number) => void
  onDone?: () => void
}

export default function TypingEngine({ text, onProgress, onDone }: Props) {
  const lines = useMemo(() => text.split(/\r?\n/), [text])
  const totalChars = useMemo(() => text.replace(/\n/g, '').length, [text])

  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [typedInWord, setTypedInWord] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [, setTypedTotal] = useState(0)
  const [correctPrefix, setCorrectPrefix] = useState(0) // number of leading chars typed that match target
  const [hasErrorInWord, setHasErrorInWord] = useState(false)

  const visible = [lines[currentLineIndex] ?? '', lines[currentLineIndex + 1] ?? '']

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = e.target.value
    const prev = inputValue

    // Determine type of change strictly
    if (next === prev) return
    const isAddition = next.length === prev.length + 1 && next.startsWith(prev)
    const isDeletion = next.length === prev.length - 1 && prev.startsWith(next)

    // Reject any edit not at end or multi-char changes
    if (!isAddition && !isDeletion) {
      setInputValue(prev)
      return
    }

    const targetLine = lines[currentLineIndex] ?? ''
    const words = targetLine.split(' ')
    const targetWord = words[currentWordIndex] ?? ''
    if (isDeletion) {
      // Handle backspace within current word buffer only
      if (typedInWord.length > 0) {
        const wasLen = typedInWord.length
        const newLen = wasLen - 1
        const removedWasCorrect = wasLen === correctPrefix
        const newTyped = typedInWord.slice(0, -1)
        setTypedInWord(newTyped)
        // Update correctPrefix and error flag
        if (removedWasCorrect) {
          setCorrectPrefix((p) => Math.max(0, p - 1))
          // decrement progress for removing a previously-counted correct char
          setTypedTotal((t) => {
            const nt = Math.max(0, t - 1)
            onProgress?.(Math.min(1, nt / totalChars))
            return nt
          })
        } else {
          // We removed part of the incorrect tail; if tail cleared, errors resolved
          if (newLen === correctPrefix) setHasErrorInWord(false)
        }
        setInputValue(next)
      } else {
        // Disallow deleting past the start of current word (no cross-word backtrack)
        setInputValue(prev)
      }
      return
    }

    const ch = next.charAt(next.length - 1)

    if (ch === ' ') {
      // finalize word
      const isLastWord = currentWordIndex >= words.length - 1
      const wordFullyCorrect = typedInWord === targetWord
      // Case 1: not last word, accept only if full word correct (or empty word)
      if (!isLastWord) {
        if ((wordFullyCorrect && !hasErrorInWord) || targetWord.length === 0) {
          setTypedTotal((t) => {
            const nt = t + 1 // count the space between words
            onProgress?.(Math.min(1, nt / totalChars))
            return nt
          })
          setTypedInWord('')
          setCurrentWordIndex(currentWordIndex + 1)
          setInputValue(prev + ' ')
          setCorrectPrefix(0)
          setHasErrorInWord(false)
        } else {
          // reject visual space when not allowed
          setInputValue(prev)
        }
        return
      }
      // Case 2: last word on the line
      if (isLastWord) {
        if (wordFullyCorrect && !hasErrorInWord) {
          // advance to next line without counting a space (no space in source)
          const nextLine = currentLineIndex + 1
          setTypedInWord('')
          setCurrentWordIndex(0)
          setCurrentLineIndex(nextLine)
          setInputValue('')
          setCorrectPrefix(0)
          setHasErrorInWord(false)
          if (nextLine >= lines.length) {
            onDone?.()
          }
        } else {
          setInputValue(prev)
        }
        return
      }
    }

    // Enforce correctness: only accept if this next character matches the target at current index
    const pos = typedInWord.length
    const expected = targetWord[pos]
    if (!expected) {
      // extra characters beyond target word length are accepted visually but do not count
      setTypedInWord(typedInWord + ch)
      setHasErrorInWord(true)
      setInputValue(prev + ch)
      return
    }
    if (ch === expected && !hasErrorInWord) {
      // Accept and count as correct continuous prefix
      setTypedInWord(typedInWord + ch)
      setCorrectPrefix(pos + 1)
      setTypedTotal((t) => {
        const nt = t + 1
        onProgress?.(Math.min(1, nt / totalChars))
        return nt
      })
      setInputValue(prev + ch)
    } else {
      // Accept visually but mark error state; do not count
      setTypedInWord(typedInWord + ch)
      setHasErrorInWord(true)
      setInputValue(prev + ch)
    }
  }

  function renderLine(lineText: string, lineIndex: number) {
    const words = lineText.split(' ')
    return (
      <div data-testid="line">
        {words.map((w, wi) => (
          <span key={wi}>
            {wi === currentWordIndex && lineIndex === currentLineIndex
              ? renderWordWithHighlight(w, typedInWord)
              : w}
            {wi < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    )
  }

  function renderWordWithHighlight(word: string, typed: string) {
    const chars = word.split('')
    const typedChars = typed.split('')
    return (
      <>
        {chars.map((c, i) => {
          const correct = typedChars[i] === c
          if (i < typedChars.length && correct) {
            return (
              <span key={i} data-testid="char-correct" style={{ background: 'rgba(0,255,0,0.3)' }}>
                {c}
              </span>
            )
          }
          return <span key={i}>{c}</span>
        })}
      </>
    )
  }

  return (
    <div>
      {renderLine(visible[0], currentLineIndex)}
      {renderLine(visible[1], currentLineIndex + 1)}
      <textarea
        aria-label="typing-input"
        value={inputValue}
        onChange={handleChange}
        onPaste={(e) => { e.preventDefault() }}
        onDrop={(e) => { e.preventDefault() }}
        onKeyDown={(e) => {
          // Optional: block Enter to keep single-line per logical input step
          if (e.key === 'Enter') e.preventDefault()
        }}
        rows={3}
        style={{ width: '100%', fontSize: 16, padding: 8, resize: 'vertical' }}
      />
    </div>
  )
}
