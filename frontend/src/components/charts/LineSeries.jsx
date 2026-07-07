import { useChartTooltip } from './useChartTooltip'

const W = 460
const H = 200
const PAD_L = 30
const PAD_R = 34
const PAD_T = 22
const PAD_B = 26

export default function LineSeries({ labels, values, color, formatValue }) {
  const { wrapRef, tip, show, hide } = useChartTooltip()
  const fmt = formatValue || ((v) => `${v}`)

  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const n = labels.length
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const spread = maxV - minV || 1
  const lo = minV - spread * 0.25
  const hi = maxV + spread * 0.25
  const stepX = n > 1 ? plotW / (n - 1) : 0

  const points = values.map((v, i) => [
    PAD_L + stepX * i,
    PAD_T + plotH - ((v - lo) / (hi - lo)) * plotH,
  ])
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaD =
    points.length > 0
      ? `${pathD} L${points[points.length - 1][0].toFixed(1)},${PAD_T + plotH} L${points[0][0].toFixed(1)},${PAD_T + plotH} Z`
      : ''
  const last = points[points.length - 1]

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + plotH} y2={PAD_T + plotH} stroke="var(--line)" strokeWidth={1} />
        {areaD && <path d={areaD} fill={color} opacity={0.1} stroke="none" />}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p[0]}
              cy={p[1]}
              r={4}
              fill={color}
              stroke="var(--surface)"
              strokeWidth={2}
              onMouseMove={(e) => show(e, fmt(values[i]))}
              onMouseLeave={hide}
            />
            <text x={p[0]} y={H - 8} textAnchor="middle" className="axis-label">
              {labels[i]}
            </text>
          </g>
        ))}
        {last && (
          <text x={last[0] + 8} y={last[1] + 4} textAnchor="start" className="bar-tip">
            {fmt(values[values.length - 1])}
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
