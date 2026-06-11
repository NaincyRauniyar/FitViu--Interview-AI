import { useEffect, useState, useCallback } from 'react'

export function useAntiCheat(onViolation) {
  const [violations, setViolations] = useState([])

  const addViolation = useCallback((type) => {
    setViolations((prev) => {
      if (prev.includes(type)) return prev
      return [...prev, type]
    })
    onViolation?.(type)
  }, [onViolation])

  useEffect(() => {
    // 1. Tab switching
    const onVisChange = () => {
      if (document.hidden) addViolation('Tab switch detected')
    }
    // 2. Window blur (Alt+Tab)
    const onBlur = () => addViolation('Window focus lost')
    // 3. Paste
    const onPaste = () => addViolation('Paste detected')
    // 4. Copy
    const onCopy = () => addViolation('Copy detected')
    // 5. Right-click disabled
    const onContext = (e) => { e.preventDefault(); addViolation('Right-click attempt') }
    // 6. DevTools shortcut
    const onKey = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I'))
        addViolation('DevTools attempt')
    }

    document.addEventListener('visibilitychange', onVisChange)
    window.addEventListener('blur', onBlur)
    document.addEventListener('paste', onPaste)
    document.addEventListener('copy', onCopy)
    document.addEventListener('contextmenu', onContext)
    window.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('visibilitychange', onVisChange)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('contextmenu', onContext)
      window.removeEventListener('keydown', onKey)
    }
  }, [addViolation])

  return { violations, addViolation }
}
