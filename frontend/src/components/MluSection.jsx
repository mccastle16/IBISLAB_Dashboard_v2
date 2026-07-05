import GroupedBarChart from './GroupedBarChart'
import { SPEAKER_COLORS, SPEAKER_LABELS } from '../lib/theme'
import './MluSection.css'

function fmt(value, digits = 2) {
  return value === null || value === undefined ? '—' : Number(value).toFixed(digits)
}

function GroupRow({ label, group }) {
  if (!group) return null
  return (
    <tr>
      <td>{label}</td>
      <td>{fmt(group.overall.mlu)}</td>
      <td>{fmt(group.overall.max, 0)}</td>
      <td>{fmt(group.overall.min, 0)}</td>
      <td>{fmt(group.overall.stdev)}</td>
      <td>{fmt(group.questions.mlu)}</td>
      <td>{fmt(group.nonQuestions.mlu)}</td>
    </tr>
  )
}

export default function MluSection({ mlu }) {
  const chartCategories = mlu.perSpeaker.map((sp) => ({
    label: sp.speaker,
    values: { mlu: sp.overall.mlu || 0 },
  }))

  return (
    <section className="mlu-section">
      <h3>Mean length of utterance (MLU)</h3>

      <GroupedBarChart
        title="Overall MLU by speaker (words / utterance)"
        series={[{ key: 'mlu', label: 'MLU', color: '#2a78d6' }]}
        categories={chartCategories}
        unit="count"
      />

      <div className="mlu-section__table-wrap">
        <table className="mlu-section__table">
          <thead>
            <tr>
              <th>Speaker</th>
              <th>MLU</th>
              <th>Max</th>
              <th>Min</th>
              <th>StDev</th>
              <th>Question MLU</th>
              <th>Non-question MLU</th>
            </tr>
          </thead>
          <tbody>
            {mlu.perSpeaker.map((sp) => (
              <tr key={sp.speaker}>
                <td>
                  <span className="mlu-section__dot" style={{ background: SPEAKER_COLORS[sp.speaker] }} />
                  {SPEAKER_LABELS[sp.speaker] || sp.speaker}
                </td>
                <td>{fmt(sp.overall.mlu)}</td>
                <td>{fmt(sp.overall.max, 0)}</td>
                <td>{fmt(sp.overall.min, 0)}</td>
                <td>{fmt(sp.overall.stdev)}</td>
                <td>{fmt(sp.questions.mlu)}</td>
                <td>{fmt(sp.nonQuestions.mlu)}</td>
              </tr>
            ))}
            <GroupRow label="All adults" group={mlu.groups.adult} />
            <GroupRow label="All children" group={mlu.groups.child} />
            <GroupRow label="Overall" group={mlu.groups.overall} />
          </tbody>
        </table>
      </div>
    </section>
  )
}
