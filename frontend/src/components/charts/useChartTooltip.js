import { useCallback, useRef, useState } from 'react'

export function useChartTooltip() {
  const wrapRef = useRef(null)
  const [tip, setTip] = useState(null)

  const show = useCallback((e, text) => {
    const rect = wrapRef.current.getBoundingClientRect()
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text })
  }, [])
  const hide = useCallback(() => setTip(null), [])

  return { wrapRef, tip, show, hide }
}
