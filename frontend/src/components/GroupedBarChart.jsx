import './GroupedBarChart.css'

const PLOT_HEIGHT = 160

function formatPct(value) {
  return `${Math.round(value * 100)}%`
}

/**
 * A small grouped column chart built in plain HTML/CSS.
 *
 * series:     [{ key, label, color }]
 * categories: [{ label, values: { [seriesKey]: number } }]
 */
export default function GroupedBarChart({ title, series, categories, unit = 'pct' }) {
  const format = unit === 'pct' ? formatPct : (v) => v.toLocaleString()
  const maxValue = unit === 'pct'
    ? 1
    : Math.max(1, ...categories.flatMap((c) => series.map((s) => c.values[s.key] || 0)))

  return (
    <figure className="bar-chart">
      {title && <figcaption className="bar-chart__title">{title}</figcaption>}

      {series.length > 1 && (
        <ul className="bar-chart__legend">
          {series.map((s) => (
            <li key={s.key}>
              <span className="bar-chart__swatch" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="bar-chart__plot" style={{ height: PLOT_HEIGHT }}>
        {categories.map((cat) => (
          <div className="bar-chart__group" key={cat.label}>
            <div className="bar-chart__bars">
              {series.map((s) => {
                const raw = cat.values[s.key] ?? 0
                const heightPct = maxValue > 0 ? Math.max(2, (raw / maxValue) * 100) : 2
                return (
                  <div className="bar-chart__bar-slot" key={s.key} title={`${s.label}: ${format(raw)}`}>
                    <span className="bar-chart__value">{format(raw)}</span>
                    <div
                      className="bar-chart__bar"
                      style={{ height: `${heightPct}%`, background: s.color }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="bar-chart__cat-label">{cat.label}</div>
          </div>
        ))}
      </div>
    </figure>
  )
}
