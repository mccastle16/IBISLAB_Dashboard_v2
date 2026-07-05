import { useState } from 'react'
import UploadPanel from './components/UploadPanel'
import ResultsView from './components/ResultsView'
import { analyzeFile } from './lib/api'
import './App.css'

function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  async function handleAnalyze(file, method) {
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeFile(file, method)
      setResult(data)
    } catch (err) {
      setError(err.message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>IBIS Dashboard</h1>
        <p>
          Upload a transcribed session and get MLU and conversational-turn metrics
          automatically — no scripts to run.
        </p>
      </header>

      <section className="upload-section">
        <UploadPanel onAnalyze={handleAnalyze} loading={loading} error={error} />
      </section>

      {result && (
        <section className="results-section">
          <ResultsView result={result} />
        </section>
      )}
    </>
  )
}

export default App
