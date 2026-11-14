const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.key ? { 'X-Volunteer-Key': options.key } : {}), ...(options.headers || {}) }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`)
  return data
}
export function ticketFromQR(raw) {
  const value = String(raw || '').trim()
  try { const parsed = JSON.parse(value); return parsed.ticketCode || parsed.code || value } catch { return value }
}
