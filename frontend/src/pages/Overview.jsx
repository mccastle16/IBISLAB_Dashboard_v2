import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getReport, exportReportUrl } from '../api/client'
import Rail from '../components/Rail'
import StatTile from '../components/StatTile'
import GroupedBars from '../components/charts/GroupedBars'
import Histogram from '../components/charts/Histogram'
import LineSeries from '../components/charts/LineSeries'

const SPEAKER_COLORS = ['var(--data-orange)', 'var(--data-green)']

function speakerSeries(sessions, speakers, field) {
  return speakers.map((sp, i) => ({
    key: sp,
    label: sp,
    color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
    values: sessions.map((s) => s[field]?.[sp] ?? 0),
  }))
}

function delta(values) {
  if (values.length < 2) return null
  const diff = Math.round((values[values.length - 1] - values[0]) * 100) / 100
  if (diff === 0) return null
  return `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}`
}

export default function Overview() {
  const { reportId } = useParams()
  const scrollRef = useRef(null)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setReport(null)
    setError('')
    getReport(reportId)
      .then(setReport)
      .catch((err) => setError(err.message))
  }, [reportId])

  if (error) {
    return (
      <div className="overview-error">
        <p>{error}</p>
        <p style={{ marginTop: 12 }}>
          <Link to="/">Upload a file</Link>
        </p>
      </div>
    )
  }

  if (!report) {
    return <div className="overview-loading">Loading report…</div>
  }

  const { file, speakers, sessions, summary } = report
  const labels = sessions.map((s) => s.id)
  const primary = summary.primary_speaker
  const latestSession = sessions[sessions.length - 1]

  const mluWordsSeries = speakerSeries(sessions, speakers, 'mlu_words')
  const turnsSeries = speakerSeries(sessions, speakers, 'turns')
  const ndwValues = sessions.map((s) => s.ndw?.[primary] ?? 0)
  const ttrValues = sessions.map((s) => s.ttr?.[primary] ?? 0)
  const avgTurnLenValues = sessions.map((s) => s.avg_turn_length ?? 0)
  const totalTurnsPerSession = sessions.map((s) => Object.values(s.turns).reduce((a, b) => a + b, 0))

  const hist = latestSession?.utterance_length_hist?.[primary]
  const histLabels = hist ? Object.keys(hist) : []
  const histCounts = hist ? Object.values(hist) : []

  return (
    <div className="app-shell">
      <Rail scrollRef={scrollRef} participantLabel={file.name} />

      <div className="main-scroll" ref={scrollRef}>
        <div className="topbar">
          <div className="file">
            <b>{file.name}</b> &middot; {sessions.length} session{sessions.length === 1 ? '' : 's'}
          </div>
          <a className="export-btn" href={exportReportUrl(reportId)} download>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" />
              <path d="M6 10l6-6 6 6" />
              <path d="M4 20h16" />
            </svg>
            Export report
          </a>
        </div>

        <div className="content">
          <section className="metric-section" id="sec-summary">
            <div className="sec-head">
              <div className="k">Summary</div>
              <h3>Across {sessions.length} session{sessions.length === 1 ? '' : 's'}</h3>
              <p>Headline numbers before the detail. Every figure below is covered in its own section.</p>
            </div>
            <div className="kpi-row">
              <StatTile
                label={`Avg. MLU — ${primary} (words)`}
                value={summary.avg_mlu_words ?? '—'}
                delta={delta(sessions.map((s) => s.mlu_words?.[primary] ?? 0))}
                trend={sessions.map((s) => s.mlu_words?.[primary] ?? 0)}
              />
              <StatTile
                label="Total conversational turns"
                value={summary.total_turns}
                delta={`${summary.avg_turns_per_session} / session`}
                trend={totalTurnsPerSession}
              />
              <StatTile
                label={`Avg. type-token ratio — ${primary}`}
                value={summary.avg_ttr ?? '—'}
                delta={delta(ttrValues)}
                trend={ttrValues}
              />
              <StatTile
                label={`Different words — ${primary}`}
                value={summary.avg_ndw ?? '—'}
                delta={delta(ndwValues)}
                trend={ndwValues}
              />
            </div>
          </section>

          <section className="metric-section" id="sec-mlu">
            <div className="sec-head">
              <div className="k">Metric group</div>
              <h3>Mean length of utterance</h3>
              <p>Average words per utterance, per session and per speaker.</p>
            </div>
            <div className="grid-2">
              <div className="card">
                <h4>MLU by session</h4>
                <div className="cap">Average words per utterance</div>
                <GroupedBars labels={labels} series={mluWordsSeries} unit="words" />
                {speakers.length > 1 && (
                  <div className="legend">
                    {speakers.map((sp, i) => (
                      <div className="item" key={sp}>
                        <span className="sw" style={{ background: SPEAKER_COLORS[i % SPEAKER_COLORS.length] }} />
                        {sp}
                      </div>
                    ))}
                  </div>
                )}
                {latestSession?.mlu_morphemes?.[primary] != null && (
                  <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--muted)' }}>
                    Latest session, morpheme-based MLU for {primary}: <b style={{ color: 'var(--ink-2)' }}>{latestSession.mlu_morphemes[primary]}</b>
                  </p>
                )}
              </div>
              <div className="card">
                <h4>Utterance length — {latestSession?.id}</h4>
                <div className="cap">Distribution, in words per utterance ({primary})</div>
                {hist ? (
                  <Histogram labels={histLabels} counts={histCounts} color="var(--data-green)" />
                ) : (
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>Not enough data yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="metric-section" id="sec-turns">
            <div className="sec-head">
              <div className="k">Metric group</div>
              <h3>Conversational turns</h3>
              <p>Contiguous runs of utterances by each speaker, per session.</p>
            </div>
            <div className="grid-2">
              <div className="card">
                <h4>Turns by speaker</h4>
                <div className="cap">Number of turns taken, per session</div>
                <GroupedBars labels={labels} series={turnsSeries} unit="turns" />
                {speakers.length > 1 && (
                  <div className="legend">
                    {speakers.map((sp, i) => (
                      <div className="item" key={sp}>
                        <span className="sw" style={{ background: SPEAKER_COLORS[i % SPEAKER_COLORS.length] }} />
                        {sp}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card">
                <h4>Avg. turn length</h4>
                <div className="cap">Utterances per turn, per session</div>
                <LineSeries labels={labels} values={avgTurnLenValues} color="var(--data-green)" formatValue={(v) => `${v} utt/turn`} />
              </div>
            </div>
          </section>

          <section className="metric-section" id="sec-lex">
            <div className="sec-head">
              <div className="k">Metric group</div>
              <h3>Lexical diversity</h3>
              <p>Vocabulary breadth (NDW) and repetition (TTR) for {primary}, tracked separately since they're different scales.</p>
            </div>
            <div className="grid-2">
              <div className="card">
                <h4>Different words (NDW)</h4>
                <div className="cap">Count of unique word types per session</div>
                <LineSeries labels={labels} values={ndwValues} color="var(--data-green)" formatValue={(v) => `${v} words`} />
              </div>
              <div className="card">
                <h4>Type-token ratio</h4>
                <div className="cap">Unique words &divide; total words</div>
                <LineSeries labels={labels} values={ttrValues} color="var(--data-green)" formatValue={(v) => v.toFixed(2)} />
              </div>
            </div>
          </section>

          <section className="metric-section" id="sec-files">
            <div className="sec-head">
              <div className="k">Source data</div>
              <h3>Session file</h3>
              <p>The upload that produced this report.</p>
            </div>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Rows</th>
                    <th>Sessions detected</th>
                    <th>Speakers</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="fname">{file.name}</td>
                    <td>{file.rows}</td>
                    <td>{sessions.length}</td>
                    <td>{speakers.join(', ')}</td>
                    <td>
                      <span className={`status-chip ${file.status === 'Processed' ? 'good' : 'warn'}`}>{file.status}</span>
                    </td>
                    <td>
                      <a href={exportReportUrl(reportId)} download style={{ color: 'var(--data-green)', font: '600 12px var(--sans)' }}>
                        Download
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
