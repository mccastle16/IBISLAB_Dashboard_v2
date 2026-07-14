import { Link } from 'react-router-dom'
import './Home.css'

const FEATURES = [
  {
    title: 'Lexical diversity',
    body: 'Track vocabulary range and word-use variety across sessions, speakers, and time.',
    icon: (
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M4 18V6m0 0 4 4M4 6 0 10m8 8V4m0 0 4 4M8 4 4 8m8 12V8m0 0 4 4m-4-4-4 4"
        transform="translate(2 1)"
      />
    ),
  },
  {
    title: 'Syntactic complexity',
    body: 'Surface sentence structure and utterance length trends as language skills develop.',
    icon: (
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M3 4h6m-6 6h14m-14 6h10M13 4h6M9 10h10"
      />
    ),
  },
  {
    title: 'Turn-taking & interaction',
    body: 'Measure conversational exchanges between children, peers, and teachers over time.',
    icon: (
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7 9.5 13 15m0-8L7 12.5"
      />
    ),
  },
  {
    title: 'Automated transcripts',
    body: 'Pull structured metrics from speech-recognition pipelines without manual coding.',
    icon: (
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9 2a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Zm-6 8a6 6 0 0 0 12 0M9 16v3m-3 0h6"
      />
    ),
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Import session data',
    body: 'Bring in coded transcripts or speech-recognition output from classroom recordings.',
  },
  {
    n: '02',
    title: 'Compute the metrics',
    body: 'The dashboard calculates linguistic and interaction metrics automatically.',
  },
  {
    n: '03',
    title: 'Explore the results',
    body: 'Review trends by child, classroom, or session in the Overview workspace.',
  },
]

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">University of Miami &middot; IBIS Lab</span>
          <h1>Calculating linguistic metrics, made visible.</h1>
          <p className="lede">
            IBIS Lab Dashboard turns classroom language and interaction data into
            clear, explorable metrics&nbsp;&mdash; built for researchers studying how children
            communicate, learn, and connect.
          </p>
          <div className="hero-actions">
            <Link to="/upload" className="btn btn-primary">
              Upload a file
            </Link>
            <a href="#features" className="btn btn-ghost">
              See what it tracks
            </a>
          </div>
        </div>

        <div className="hero-panel" aria-hidden="true">
          <div className="panel-card">
            <span className="panel-label">Sample session preview</span>
            <div className="panel-row">
              <span>Lexical diversity</span>
              <span className="panel-value">0.74</span>
            </div>
            <div className="panel-bar">
              <div className="panel-bar-fill" style={{ width: '74%' }} />
            </div>

            <div className="panel-row">
              <span>Mean utterance length</span>
              <span className="panel-value">4.2</span>
            </div>
            <div className="panel-bar">
              <div className="panel-bar-fill panel-bar-fill--alt" style={{ width: '58%' }} />
            </div>

            <div className="panel-row">
              <span>Peer turn-taking</span>
              <span className="panel-value">61%</span>
            </div>
            <div className="panel-bar">
              <div className="panel-bar-fill" style={{ width: '61%' }} />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <h2 className="section-title">What the dashboard tracks</h2>
        <p className="section-sub">
          A shared set of metrics for looking at language development and interaction
          from every angle.
        </p>

        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <svg className="feature-icon" viewBox="0 0 20 20" width="22" height="22">
                {f.icon}
              </svg>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="steps">
        <h2 className="section-title">How it works</h2>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div className="step" key={s.n}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta">
        <h2>Ready to look at the data?</h2>
        <p>Upload a session file to get started.</p>
        <Link to="/upload" className="btn btn-primary">
          Upload a file
        </Link>
      </section>
    </div>
  )
}
