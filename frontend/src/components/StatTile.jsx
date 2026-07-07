function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  const points = values
    .map((v, i) => {
      const x = 2 + (i * 116) / (values.length - 1)
      const y = 24 - ((v - min) / spread) * 20
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" height="28" viewBox="0 0 120 28" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function StatTile({ label, value, delta, trend }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="row">
        <span className="value">{value}</span>
        {delta && <span className="delta">{delta}</span>}
      </div>
      <Sparkline values={trend} color="var(--data-green)" />
    </div>
  )
}
