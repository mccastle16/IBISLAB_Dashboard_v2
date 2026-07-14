import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './Upload.css'

const ACCEPTED_EXTENSION = '.xlsx'
const MAX_FILE_SIZE = 20 * 1024 * 1024

export default function Upload() {
  const [status, setStatus] = useState('idle') // idle | dragging | uploading | success | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFiles = useCallback(async (files) => {
    const file = files?.[0]
    if (!file) return

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (extension !== ACCEPTED_EXTENSION) {
      setStatus('error')
      setError(`"${file.name}" isn't a .xlsx file. Export your data as an Excel workbook and try again.`)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus('error')
      setError(`"${file.name}" is larger than 20 MB.`)
      return
    }

    setStatus('uploading')
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed.')
      }
      setResult(data)
      setStatus('success')
    } catch {
      setStatus('error')
      setError('Something went wrong reaching the server. Confirm the backend is running and try again.')
    }
  }, [])

  const openPicker = () => {
    if (status !== 'uploading') inputRef.current?.click()
  }

  const onDrop = (e) => {
    e.preventDefault()
    if (status !== 'uploading') handleFiles(e.dataTransfer.files)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    if (status !== 'uploading') setStatus('dragging')
  }

  const onDragLeave = () => {
    setStatus((s) => (s === 'dragging' ? 'idle' : s))
  }

  const reset = () => {
    setStatus('idle')
    setResult(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="upload-page">
      <section className="upload-hero">
        <span className="eyebrow">University of Miami &middot; IBIS Lab</span>
        <h1>Upload a session file.</h1>
        <p className="lede">
          Bring in a coded transcript workbook and its metrics will be ready to explore
          in the Overview workspace.
        </p>
      </section>

      <section className="upload-section">
        <div
          className={`dropzone dropzone--${status}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openPicker()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload an Excel file"
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSION}
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />

          {status === 'uploading' && (
            <>
              <span className="dropzone-spinner" aria-hidden="true" />
              <p className="dropzone-title">Uploading&hellip;</p>
            </>
          )}

          {status === 'success' && result && (
            <>
              <svg className="dropzone-icon dropzone-icon--success" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m5 12.5 4.5 4.5L19 7" />
              </svg>
              <p className="dropzone-title">{result.filename} uploaded</p>
              <p className="dropzone-sub">
                {result.rows} rows &middot; {result.columns} columns &middot; sheet &ldquo;{result.sheet_name}&rdquo;
              </p>
            </>
          )}

          {status !== 'uploading' && status !== 'success' && (
            <>
              <svg className="dropzone-icon" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15V4m0 0 4 4m-4-4-4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
              </svg>
              <p className="dropzone-title">Drag and drop your .xlsx file here</p>
              <p className="dropzone-sub">or click to browse from your computer</p>
            </>
          )}
        </div>

        {status === 'error' && (
          <p className="upload-error" role="alert">
            {error}
          </p>
        )}

        <div className="upload-actions">
          {status === 'success' ? (
            <>
              <Link to="/overview" className="btn btn-primary">
                Go to Overview
              </Link>
              <button type="button" className="btn btn-ghost" onClick={reset}>
                Upload another file
              </button>
            </>
          ) : (
            <p className="upload-hint">Accepts .xlsx workbooks up to 20 MB.</p>
          )}
        </div>
      </section>
    </div>
  )
}
