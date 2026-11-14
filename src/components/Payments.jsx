import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, XCircle, RefreshCw, Search, KeyRound, Mail, Phone, Copy, Send } from 'lucide-react'
import { api } from '../api'
import '../styles/payments.css'

const TABS = [
  { id: 'SUBMITTED', label: 'To verify' },
  { id: 'PAID', label: 'Approved' },
  { id: 'PENDING', label: 'Not paid yet' },
  { id: 'REJECTED', label: 'Rejected' },
]

export default function Payments() {
  const [adminKey, setAdminKey] = useState(sessionStorage.getItem('sparkleAdminKey') || '')
  const [keyInput, setKeyInput] = useState('')
  const [tab, setTab] = useState('SUBMITTED')
  const [data, setData] = useState({ counts: {}, items: [] })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const call = useCallback(
    (path, options = {}) => api(path, { ...options, headers: { 'X-Admin-Key': adminKey } }),
    [adminKey],
  )

  const logout = () => {
    sessionStorage.removeItem('sparkleAdminKey')
    setAdminKey('')
    setData({ counts: {}, items: [] })
  }

  const load = useCallback(async () => {
    if (!adminKey) return
    setLoading(true)
    setError('')
    try {
      setData(await call(`/api/admin/payments?status=${tab}`))
    } catch (e) {
      if (/401|authentication/i.test(e.message)) {
        sessionStorage.removeItem('sparkleAdminKey')
        setAdminKey('')
        setError('Invalid admin key.')
      } else setError(e.message === 'Failed to fetch' ? 'Cannot connect to the backend.' : e.message)
    } finally {
      setLoading(false)
    }
  }, [adminKey, tab, call])

  useEffect(() => { load() }, [load])

  // new submissions show up on their own
  useEffect(() => {
    if (!adminKey || tab !== 'SUBMITTED') return
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [adminKey, tab, load])

  async function approve(row) {
    const ok = window.confirm(
      `Approve ${row.fullName}?\n\nCheck your GPay history first:\n• Amount: ₹${row.amount}\n• UTR: ${row.utr}\n\nThis issues the ticket and emails ${row.email}.`,
    )
    if (!ok) return
    setBusyId(row.id); setNotice(''); setError('')
    try {
      const r = await call(`/api/admin/payments/${row.id}/approve`, { method: 'POST' })
      setNotice(`Approved ${row.fullName} – ticket ${r.ticketCode} emailed to ${row.email}.`)
      await load()
    } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  async function reject(row) {
    const reason = window.prompt(`Reject ${row.fullName}? Reason shown to the participant:`, 'Payment not found in our account for this transaction ID.')
    if (reason === null) return
    setBusyId(row.id); setNotice(''); setError('')
    try {
      await call(`/api/admin/payments/${row.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
      setNotice(`Rejected ${row.fullName}. They have been emailed.`)
      await load()
    } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  async function resend(row) {
    setBusyId(row.id); setNotice(''); setError('')
    try {
      await call(`/api/admin/payments/${row.id}/resend`, { method: 'POST' })
      setNotice(`Welcome mail re-sent to ${row.email}.`)
    } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => setNotice(`Copied ${text}`)).catch(() => {})

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.items
    return data.items.filter((r) =>
      [r.fullName, r.email, r.phone, r.college, r.utr, r.reference, r.ticketCode, r.eventTitle]
        .some((v) => String(v || '').toLowerCase().includes(q)))
  }, [data.items, query])

  if (!adminKey) {
    return (
      <section className="work-card pay-admin">
        <span className="mini-label">PAYMENT VERIFICATION</span>
        <h2>Organizer access</h2>
        <p className="pay-admin-muted">Enter the admin key (ADMIN_API_KEY). Volunteers do not need this.</p>
        <form
          className="pay-key-form"
          onSubmit={(e) => {
            e.preventDefault()
            const k = keyInput.trim()
            sessionStorage.setItem('sparkleAdminKey', k)
            setAdminKey(k)
            setKeyInput('')
            setError('')
          }}
        >
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Admin key" required autoComplete="current-password" />
          <button className="primary-btn" type="submit"><KeyRound size={16} /> Unlock</button>
        </form>
        {error && <p className="app-error">{error}</p>}
      </section>
    )
  }

  return (
    <section className="work-card pay-admin">
      <div className="work-heading">
        <div>
          <span className="mini-label">PAYMENT VERIFICATION</span>
          <h2>GPay payments</h2>
          <p>Match the UTR and amount with your GPay history, then approve to issue the ticket.</p>
        </div>
        <div className="pay-admin-actions">
          <button className="secondary-btn" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
          <button className="secondary-btn" onClick={logout}>Lock</button>
        </div>
      </div>

      <div className="pay-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'pay-tab active' : 'pay-tab'} onClick={() => { setTab(t.id); setNotice('') }}>
            {t.label} <span>{data.counts?.[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="present-search pay-search">
        <Search size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, UTR, phone, email, reference…" />
      </div>

      {notice && <p className="pay-notice">{notice}</p>}
      {error && <p className="app-error">{error}</p>}

      {loading && rows.length === 0 ? (
        <div className="pay-empty">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="pay-empty">Nothing here.</div>
      ) : (
        <div className="pay-list">
          {rows.map((r) => (
            <article className="pay-row" key={r.id}>
              <div className="pay-row-main">
                <b className="pay-name">{r.fullName}</b>
                <span className="pay-event">{r.eventTitle} · ₹{r.amount}</span>
                <span className="pay-meta"><Mail size={13} /> {r.email}</span>
                <span className="pay-meta"><Phone size={13} /> {r.phone} · {r.college}</span>
                <small className="pay-meta">
                  {r.reference}
                  {r.submittedAt && ` · submitted ${new Date(r.submittedAt).toLocaleString()}`}
                  {r.rejectReason && ` · ${r.rejectReason}`}
                </small>
              </div>
              <div className="pay-row-side">
                {r.utr && (
                  <button className="pay-utr-chip" title="Copy UTR" onClick={() => copy(r.utr)}>
                    UTR {r.utr} <Copy size={13} />
                  </button>
                )}
                {r.ticketCode && <small className="pay-ticket">{r.ticketCode}</small>}
                <div className="pay-btns">
                  {r.status !== 'PAID' && r.status !== 'PENDING' && (
                    <>
                      <button className="pay-approve" disabled={busyId === r.id} onClick={() => approve(r)}><BadgeCheck size={15} /> Approve</button>
                      {r.status !== 'REJECTED' && (
                        <button className="pay-reject" disabled={busyId === r.id} onClick={() => reject(r)}><XCircle size={15} /> Reject</button>
                      )}
                    </>
                  )}
                  {r.status === 'PAID' && (
                    <button className="pay-resend" disabled={busyId === r.id} onClick={() => resend(r)}><Send size={14} /> Resend mail</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
