import { useRef, useState } from 'react'
import './UploadPanel.css'

const METHODS = [
  { key: 'naive', label: 'Fast (rule-based)', hint: 'Speaker change + 5s gap. Seconds per file.' },
  { key: 'whisper', label: 'Semantic (AI embeddings)', hint: 'Sentence-similarity model. Slower, first run downloads the model.' },
  { key: 'both', label: 'Both', hint: 'Runs both methods and shows them side by side.' },
]

const ACCEPTED = '.csv,.xlsx,.xls'

export default function UploadPanel({ onAnalyze, loading, error }) {
  const [file, setFile] = useState(null)
  const [method, setMethod] = useState('naive')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  function pickFile(f) {
    if (!f) return
    setFile(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragActive(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!file || loading) return
    onAnalyze(file, method)
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div
        className={`upload-panel__dropzone${dragActive ? ' is-active' : ''}${file ? ' has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          hidden
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {file ? (
          <>
            <p className="upload-panel__filename">{file.name}</p>
            <p className="upload-panel__hint">Click or drop to replace</p>
          </>
        ) : (
          <>
            <p className="upload-panel__cta">Drop a transcript file here, or click to browse</p>
            <p className="upload-panel__hint">.csv, .xlsx, or .xls</p>
          </>
        )}
      </div>

      <fieldset className="upload-panel__methods">
        <legend>Conversational-turn method</legend>
        {METHODS.map((m) => (
          <label key={m.key} className="upload-panel__method">
            <input
              type="radio"
              name="method"
              value={m.key}
              checked={method === m.key}
              onChange={() => setMethod(m.key)}
            />
            <span>
              <strong>{m.label}</strong>
              <small>{m.hint}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {error && <p className="upload-panel__error" role="alert">{error}</p>}

      <button type="submit" className="upload-panel__submit" disabled={!file || loading}>
        {loading ? 'Analyzing…' : 'Analyze file'}
      </button>
    </form>
  )
}
