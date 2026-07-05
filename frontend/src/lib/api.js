export async function analyzeFile(file, method) {
  const body = new FormData()
  body.append('file', file)
  body.append('method', method)

  const response = await fetch('/api/analyze', { method: 'POST', body })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.detail || `Request failed (${response.status})`
    throw new Error(message)
  }
  return payload
}
