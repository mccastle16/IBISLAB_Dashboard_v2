import StatTile from './StatTile'
import MluSection from './MluSection'
import TurnsSection from './TurnsSection'
import './ResultsView.css'

export default function ResultsView({ result }) {
  return (
    <div className="results-view">
      <div className="results-view__file-info">
        <h2>{result.fileName}</h2>
        <p>
          Speaker column: <code>{result.speakerColumn}</code> · Speakers found:{' '}
          {result.speakersPresent.join(', ')} · {result.rowsAnalyzed} utterances analyzed
          {result.minutes ? ` · ${result.minutes} min session` : ''}
        </p>
      </div>

      {result.warnings?.length > 0 && (
        <div className="results-view__warnings">
          {result.warnings.map((w) => <p key={w}>{w}</p>)}
        </div>
      )}

      <div className="results-view__tiles">
        <StatTile label="Total utterances" value={result.totals.utterances} />
        <StatTile label="Total questions" value={result.totals.questions} />
        <StatTile label="Total statements" value={result.totals.statements} />
      </div>

      <MluSection mlu={result.mlu} />
      <TurnsSection turns={result.turns} />
    </div>
  )
}
