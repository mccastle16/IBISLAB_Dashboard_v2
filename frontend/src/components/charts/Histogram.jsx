import { useChartTooltip } from './useChartTooltip'

const W = 460
const H = 200
const PAD_L = 26
const PAD_R = 10
const PAD_T = 20
const PAD_B = 26

export default function Histogram({ labels, counts, color, unit = 'utterances' }) {
  const { wrapRef, tip, show, hide } = useChartTooltip()

  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const maxV = Math.max(1, ...counts) * 1.2
  const n = labels.length
  const slot = n ? plotW / n : plotW
  const barW = Math.min(34, slot * 0.6)

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="var(--line)" strokeWidth={1} />
        {labels.map((label, i) => {
          const cx = PAD_L + slot * i + slot / 2
          const h = (counts[i] / maxV) * plotH
          const x = cx - barW / 2
          const y = H - PAD_B - h
          return (
            <g key={label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                rx={4}
                ry={4}
                fill={color}
                onMouseMove={(e) => show(e, `${counts[i]} ${unit}`)}
                onMouseLeave={hide}
              />
              <text x={cx} y={H - 8} textAnchor="middle" className="axis-label">
                {label}
              </text>
            </g>
          )
        })}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}
