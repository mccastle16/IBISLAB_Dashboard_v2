import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadWorkbook } from '../api/client'

const RECENTS_KEY = 'ibislab_recent_reports'

function loadRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY)) || []
  } catch {
    return []
  }
}

function saveRecent(entry) {
  const recents = [entry, ...loadRecents().filter((r) => r.reportId !== entry.reportId)].slice(0, 5)
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents))
  return recents
}

export default function Home() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('idle') // idle | uploading | error
  const [error, setError] = useState('')
  const [recents] = useState(loadRecents)

  const handleFile = useCallback(
    async (file) => {
      if (!file) return
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        setStatus('error')
        setError('Please upload a .xlsx or .xls file.')
        return
      }
      setStatus('uploading')
      setError('')
      try {
        const data = await uploadWorkbook(file)
        saveRecent({ reportId: data.report_id, name: data.file.name, uploadedAt: new Date().toISOString() })
        navigate(`/overview/${data.report_id}`)
      } catch (err) {
        setStatus('error')
        setError(err.message)
      }
    },
    [navigate]
  )

  return (
    <div className="upload-page">
      <div className="mark">
        <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M27,10 L27,54 A23,23 0 0 1 73,54 L73,10" fill="none" stroke="#fff" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M27,10 L27,54 A23,23 0 0 1 50,77" fill="none" stroke="var(--brand-orange)" strokeWidth="24" strokeLinecap="round" />
          <path d="M50,77 A23,23 0 0 1 73,54 L73,10" fill="none" stroke="var(--brand-green)" strokeWidth="24" strokeLinecap="round" />
        </svg>
        <div className="wordmark">
          <b>IBIS LAB</b>
          <span>University of Miami &middot; Linguistics</span>
        </div>
      </div>

      <h1>Turn a transcript into a session report.</h1>
      <p className="sub">
        Upload a coded language-sample export and IBIS Lab will calculate MLU, conversational turns, and lexical
        diversity automatically.
      </p>

      <div
        className={`dropzone${dragging ? ' drag' : ''}${status === 'uploading' ? ' processing' : ''}`}
        tabIndex={0}
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4" />
            <path d="M6 10l6-6 6 6" />
            <path d="M4 20h16" />
          </svg>
        </div>
        <strong>{status === 'uploading' ? 'Processing your file…' : 'Drop your Excel file here'}</strong>
        <div className="hint">or click to browse — .xlsx from SALT / CLAN exports</div>
        <button className="browse-btn" type="button" disabled={status === 'uploading'}>
          {status === 'uploading' && <span className="spinner" />}
          {status === 'uploading' ? 'Uploading' : 'Browse files'}
        </button>
      </div>

      {status === 'error' && <div className="upload-error">{error}</div>}

      <div className="filetypes">
        <span>.XLSX</span>
        <span>.XLS</span>
        <span>Max 25MB</span>
      </div>

      {recents.length > 0 && (
        <div className="recent" style={{ marginTop: 40, width: '100%', maxWidth: 520, textAlign: 'left' }}>
          <div className="label" style={{ font: '600 11px var(--sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Recently processed
          </div>
          {recents.map((r) => (
            <div
              key={r.reportId}
              onClick={() => navigate(`/overview/${r.reportId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--line)', fontSize: 13.5, cursor: 'pointer' }}
            >
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(r.uploadedAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
