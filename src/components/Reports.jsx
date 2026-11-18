import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, RefreshCw, KeyRound, Download, Users, UserCheck, IndianRupee } from 'lucide-react'
import { api } from '../api'
import { buildEventReports, summarizeReports, downloadEventReport, downloadAllEventsWorkbook } from '../exportExcel'
import '../styles/reports.css'

// Event-wise Excel reports for coordinators (one sheet / file per event)
export default function Reports({ accessKey }) {
  const [adminKey, setAdminKey] = useState(sessionStorage.getItem('sparkleAdminKey') || '')
  const [keyInput, setKeyInput] = useState('')
  const [events, setEvents] = useState([])
  const [paid, setPaid] = useState([])
  const [present, setPresent] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warn, setWarn] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    if (!adminKey) return
    setLoading(true); setError(''); setWarn('')
    const [ev, pay, pres] = await Promise.allSettled([
      api('/api/events'),
      api('/api/admin/payments?status=PAID', { headers: { 'X-Admin-Key': adminKey } }),
      api('/api/attendance/present', { key: accessKey }),
    ])
    if (ev.status === 'rejected') setError('Cannot load the event list. Is the backend running?')
    else setEvents(Array.isArray(ev.value) ? ev.value : [])
    if (pay.status === 'rejected') {
      if (/401|authentication/i.test(pay.reason?.message || '')) {
        sessionStorage.removeItem('sparkleAdminKey'); setAdminKey(''); setError('Invalid admin key.')
      } else setError(pay.reason?.message || 'Cannot load approved payments.')
    } else setPaid(Array.isArray(pay.value?.items) ? pay.value.items : [])
    if (pres.status === 'rejected') setWarn('Attendance list could not be loaded – Present/Absent and on-spot rows may be missing.')
    else setPresent(Array.isArray(pres.value) ? pres.value : [])
    setLoading(false)
  }, [adminKey, accessKey])

  useEffect(() => { load() }, [load])

  const reports = useMemo(() => buildEventReports(events, paid, present), [events, paid, present])
  const shown = reports.filter((r) => filter === 'all' || r.event.level === filter)
  const totals = useMemo(() => summarizeReports(paid, present), [paid, present])

  if (!adminKey) {
    return (
      <section className="work-card pay-admin">
        <span className="mini-label">REPORTS</span>
        <h2>Organizer access</h2>
        <p className="pay-admin-muted">Enter the admin key (ADMIN_API_KEY) to download event reports.</p>
        <form className="pay-key-form" onSubmit={(e) => {
          e.preventDefault()
          const k = keyInput.trim()
          sessionStorage.setItem('sparkleAdminKey', k); setAdminKey(k); setKeyInput(''); setError('')
        }}>
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Admin key" required autoComplete="current-password" />
          <button className="primary-btn" type="submit"><KeyRound size={16} /> Unlock</button>
        </form>
        {error && <p className="app-error">{error}</p>}
      </section>
    )
  }

  return (
    <section className="work-card pay-admin reports-page">
      <div className="work-heading">
        <div>
          <span className="mini-label">PAYMENTS · REPORTS</span>
          <h2>Event reports</h2>
          <p>One Excel sheet per event for the coordinators – approved registrations, on-spot entries, team members (one row each) and attendance.</p>
        </div>
        <div className="pay-admin-actions">
          <button className="secondary-btn" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
          <button className="primary-btn" onClick={() => downloadAllEventsWorkbook(reports, totals)} disabled={loading || !reports.length}>
            <FileSpreadsheet size={15} /> Download all ({reports.length} sheets)
          </button>
        </div>
      </div>

      <div className="rep-totals">
        <div><Users size={16} /><span>Registered (unique)</span><b>{totals.registered}</b></div>
        <div><UserCheck size={16} /><span>Present</span><b>{totals.present}</b></div>
        <div><IndianRupee size={16} /><span>Collected</span><b>₹{totals.collected}</b></div>
      </div>

      <div className="pay-tabs">
        {[['all', 'All events'], ['senior', 'Senior'], ['junior', 'Junior (School)']].map(([id, label]) => (
          <button key={id} className={filter === id ? 'pay-tab active' : 'pay-tab'} onClick={() => setFilter(id)}>
            {label} <span>{id === 'all' ? reports.length : reports.filter((r) => r.event.level === id).length}</span>
          </button>
        ))}
      </div>

      {error && <p className="app-error">{error}</p>}
      {warn && <p className="pay-notice">{warn}</p>}

      {loading && !reports.length ? (
        <div className="pay-empty">Loading…</div>
      ) : !shown.length ? (
        <div className="pay-empty">No events found.</div>
      ) : (
        <div className="rep-grid">
          {shown.map((r) => (
            <article className="rep-card" key={r.event.id || r.event.title}>
              <div className="rep-top">
                <b>{r.event.title}</b>
                <span className={r.event.level === 'junior' ? 'rep-badge junior' : 'rep-badge'}>
                  {r.event.level === 'junior' ? 'Junior · School' : 'Senior'}
                </span>
              </div>
              <div className="rep-stats">
                <div><span>Registered</span><b>{r.total}</b></div>
                {r.teams.length > 0 && <div><span>Teams</span><b>{r.teams.length}</b></div>}
                <div><span>Present</span><b>{r.present}</b></div>
                <div><span>Absent</span><b>{r.total - r.present}</b></div>
              </div>
              <button className="primary-btn rep-dl" onClick={() => downloadEventReport(r)}>
                <Download size={15} /> Download Excel
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
