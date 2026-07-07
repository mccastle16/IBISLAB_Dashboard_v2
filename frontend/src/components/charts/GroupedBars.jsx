import { useChartTooltip } from './useChartTooltip'

const W = 460
const H = 200
const PAD_L = 32
const PAD_R = 10
const PAD_T = 14
const PAD_B = 26

// Renders 1 or 2 series of bars grouped per label (session). Used for MLU
// (morphemes vs. words) and for conversational turns (per-speaker).
export default function GroupedBars({ labels, series, unit = '', formatValue }) {
  const { wrapRef, tip, show, hide } = useChartTooltip()
  const fmt = formatValue || ((v) => `${v}${unit ? ' ' + unit : ''}`)

  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const allValues = series.flatMap((s) => s.values)
  const maxV = Math.max(1, ...allValues) * 1.15
  const n = labels.length
  const slot = n ? plotW / n : plotW
  const barW = series.length > 1 ? Math.min(16, slot * 0.28) : Math.min(24, slot * 0.4)
  const gap = 2

  const lastSeries = series[0]

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="var(--line)" strokeWidth={1} />
        {labels.map((label, i) => {
          const cx = PAD_L + slot * i + slot / 2
          return (
            <g key={label}>
              {series.map((s, si) => {
                const value = s.values[i] ?? 0
                const h = (value / maxV) * plotH
                let x
                if (series.length > 1) {
                  x = si === 0 ? cx - barW - gap / 2 : cx + gap / 2
                } else {
                  x = cx - barW / 2
                }
                const y = H - PAD_B - h
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, 2)}
                    rx={4}
                    ry={4}
                    fill={s.color}
                    onMouseMove={(e) => show(e, `${s.label}: ${fmt(value)}`)}
                    onMouseLeave={hide}
                  />
                )
              })}
              <text x={cx} y={H - 8} textAnchor="middle" className="axis-label">
                {label}
              </text>
            </g>
          )
        })}
        {lastSeries && n > 0 && (
          <text
            x={
              PAD_L + slot * (n - 1) + slot / 2 - (series.length > 1 ? barW + gap / 2 - barW / 2 : 0)
            }
            y={H - PAD_B - (lastSeries.values[n - 1] / maxV) * plotH - 8}
            textAnchor="middle"
            className="bar-tip"
          >
            {fmt(lastSeries.values[n - 1])}
          </text>
        )}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}
