import { useState } from 'react'
import GroupedBarChart from './GroupedBarChart'
import StatTile from './StatTile'
import { GROUP_COLORS } from '../lib/theme'
import './TurnsSection.css'

const METHOD_LABELS = {
  naive: 'Fast (rule-based)',
  whisper: 'Semantic (AI embeddings)',
}

const SERIES = [
  { key: 'adult', label: 'Adult (FEM + MAL)', color: GROUP_COLORS.adult },
  { key: 'child', label: 'Child (CHI + KCHI)', color: GROUP_COLORS.child },
]

function MethodPanel({ data }) {
  const categories = [
    {
      label: 'Response is a question',
      values: { adult: data.adult.responseQuestionPct, child: data.child.responseQuestionPct },
    },
    {
      label: 'Response is a statement',
      values: { adult: data.adult.responseStatementPct, child: data.child.responseStatementPct },
    },
  ]

  return (
    <div className="turns-panel">
      <GroupedBarChart
        title="Conversational responses, adult vs. child"
        series={SERIES}
        categories={categories}
        unit="pct"
      />
      <div className="turns-panel__tiles">
        <StatTile label="Adult response questions" value={data.adult.responseQuestions} />
        <StatTile label="Adult response statements" value={data.adult.responseStatements} />
        <StatTile label="Child response questions" value={data.child.responseQuestions} />
        <StatTile label="Child response statements" value={data.child.responseStatements} />
      </div>
    </div>
  )
}

export default function TurnsSection({ turns }) {
  const methods = Object.keys(turns)
  const [active, setActive] = useState(methods[0])

  if (methods.length === 0) {
    return (
      <section className="turns-section">
        <h3>Conversational turns</h3>
        <p className="turns-section__warning">No conversational-turn data available for this file.</p>
      </section>
    )
  }

  return (
    <section className="turns-section">
      <h3>Conversational turns</h3>

      {methods.length > 1 && (
        <div className="turns-section__tabs">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              className={active === m ? 'is-active' : ''}
              onClick={() => setActive(m)}
            >
              {METHOD_LABELS[m] || m}
            </button>
          ))}
        </div>
      )}

      <MethodPanel data={turns[active] || turns[methods[0]]} />
    </section>
  )
}
