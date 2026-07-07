export async function uploadWorkbook(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || 'Upload failed.')
  }
  return data
}

export async function getReport(reportId) {
  const res = await fetch(`/api/report/${reportId}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || 'Could not load this report.')
  }
  return data
}

export function exportReportUrl(reportId) {
  return `/api/report/${reportId}/export`
}
