import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, XCircle, RefreshCw, Search, KeyRound, Mail, Phone, Copy, Send, Users } from 'lucide-react'
import { api } from '../api'
import '../styles/payments.css'

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()

const TABS = [
  { id: 'SUBMITTED', label: 'To verify' },
  { id: 'PAID', label: 'Approved' },
  { id: 'PENDING', label: 'Not paid yet' },
  { id: 'REJECTED', label: 'Rejected' },
]

// "Team of 4" / "" - one registration = one team; the leader row carries the payment, every member gets own ticket + mail
const isTeam = (r) => (r.teamSize || 1) > 1
const memberEmails = (r) => (r.members?.length ? r.members.map((m) => m.email) : [r.email])

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
  const [events, setEvents] = useState([])
  const [level, setLevel] = useState('all')

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

  useEffect(() => {
    api('/api/events').then((d) => setEvents(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // junior events are school-student only, so those registrations always need manual approval
  const levelOf = useCallback((r) => {
    if (r.level) return String(r.level).toLowerCase()
    const ev = events.find((e) => (r.eventId && e.id === r.eventId) || norm(e.title) === norm(r.eventTitle))
    return ev?.level || ''
  }, [events])
  const isJunior = (r) => levelOf(r) === 'junior'

  // new submissions show up on their own
  useEffect(() => {
    if (!adminKey || tab !== 'SUBMITTED') return
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [adminKey, tab, load])

  async function approve(row) {
    const team = isTeam(row)
    const ok = window.confirm(
<<<<<<< HEAD
      isJunior(row)
        ? `Approve ${row.fullName}?\n\nJUNIOR event – school students only.\nCheck the school name / class (${row.college}${row.year ? ' · ' + row.year : ''}) before approving.${row.utr ? `\n\nAlso verify GPay:\n• Amount: ₹${row.amount}\n• UTR: ${row.utr}` : ''}\n\nThis issues the ticket and emails ${row.email}.`
        : `Approve ${row.fullName}?\n\nCheck your GPay history first:\n• Amount: ₹${row.amount}\n• UTR: ${row.utr}\n\nThis issues the ticket and emails ${row.email}.`,
=======
      `Approve ${team ? `team of ${row.teamSize} (leader ${row.fullName})` : row.fullName}?\n\nCheck your GPay history first:\n• Amount: ₹${row.amount}${team ? ` (${row.teamSize} members)` : ''}\n• UTR: ${row.utr}\n\n` +
        (team
          ? `This issues ${row.teamSize} separate tickets and emails each member:\n${memberEmails(row).map((e) => '  - ' + e).join('\n')}`
          : `This issues the ticket and emails ${row.email}.`),
>>>>>>> a22228a (team update)
    )
    if (!ok) return
    setBusyId(row.id); setNotice(''); setError('')
    try {
      const r = await call(`/api/admin/payments/${row.id}/approve`, { method: 'POST' })
      const who = isTeam(row) ? `team of ${row.teamSize} (${row.fullName})` : row.fullName
      if (r.alreadyApproved)
        setNotice(`${who} was already approved (ticket ${r.ticketCode}). Use "Resend mail" if they did not get it.`)
      else if (r.mailSent)
        setNotice(`Approved ${who} – ${isTeam(row) ? `${row.teamSize} tickets emailed, one to each member.` : `ticket ${r.ticketCode} emailed to ${row.email}.`}`)
      else
        setError(`Approved ${who} but some emails were NOT sent: ${r.mailError || 'unknown error'}. Fix the mail setup / email address, then open the Approved tab and press "Resend mail" (it re-sends to every member).`)
      await load()
    } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  async function reject(row) {
<<<<<<< HEAD
    const reason = window.prompt(`Reject ${row.fullName}? Reason shown to the participant:`, isJunior(row) ? 'We could not verify your school details (Junior events are for Class 8 to 12 students).' : 'Payment not found in our account for this transaction ID.')
=======
    const reason = window.prompt(`Reject ${isTeam(row) ? `team of ${row.teamSize} (${row.fullName})` : row.fullName}? Reason shown to the ${isTeam(row) ? 'team leader' : 'participant'}:`, 'Payment not found in our account for this transaction ID.')
>>>>>>> a22228a (team update)
    if (reason === null) return
    setBusyId(row.id); setNotice(''); setError('')
    try {
      const r = await call(`/api/admin/payments/${row.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
      if (r.mailSent) setNotice(`Rejected ${row.fullName}${isTeam(row) ? ' (whole team)' : ''}. They have been emailed.`)
      else setError(`Rejected ${row.fullName}${isTeam(row) ? ' (whole team)' : ''}, but the email was NOT sent: ${r.mailError || 'unknown error'}.`)
      await load()
    } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  async function resend(row) {
    setBusyId(row.id); setNotice(''); setError('')
    try {
      const r = await call(`/api/admin/payments/${row.id}/resend`, { method: 'POST' })
      if (r.mailSent) setNotice(isTeam(row) ? `Welcome mails re-sent to all ${row.teamSize} members.` : `Welcome mail re-sent to ${row.email}.`)
      else setError(`Mail FAILED: ${r.mailError || 'unknown error'}.`)
    } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  async function testMail() {
    const to = window.prompt('Send a test mail to which email address?')
    if (!to || !to.trim()) return
    setNotice(''); setError('')
    try {
      const r = await call('/api/admin/payments/mail-test', { method: 'POST', body: JSON.stringify({ to: to.trim() }) })
      if (r.mailSent) setNotice(`Test mail sent to ${to.trim()}. Mail setup is working.`)
      else setError(`Test mail FAILED: ${r.mailError || 'unknown error'}`)
    } catch (e) { setError(e.message) }
  }

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => setNotice(`Copied ${text}`)).catch(() => {})

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
<<<<<<< HEAD
    const byLevel = level === 'all' ? data.items : data.items.filter((r) => levelOf(r) === level)
    if (!q) return byLevel
    return byLevel.filter((r) =>
      [r.fullName, r.email, r.phone, r.college, r.utr, r.reference, r.ticketCode, r.eventTitle]
=======
    if (!q) return data.items
    return data.items.filter((r) =>
      [r.fullName, r.email, r.phone, r.college, r.utr, r.reference, r.ticketCode, r.eventTitle, r.teamName,
        ...(r.members || []).flatMap((m) => [m.fullName, m.email, m.phone, m.ticketCode])]
>>>>>>> a22228a (team update)
        .some((v) => String(v || '').toLowerCase().includes(q)))
  }, [data.items, query, level, levelOf])

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
          <p>Match the UTR and amount with your GPay history, then approve to issue the ticket(s). A team pays once (₹ per member × members) and each member gets their own ticket by mail.</p>
        </div>
        <div className="pay-admin-actions">
          <button className="secondary-btn" onClick={testMail}><Mail size={15} /> Test mail</button>
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

      <div className="pay-filter">
        {[['all', 'All events'], ['junior', 'Junior (School)'], ['senior', 'Senior']].map(([id, label]) => (
          <button key={id} className={level === id ? 'pay-tab active' : 'pay-tab'} onClick={() => setLevel(id)}>
            {label} <span>{id === 'all' ? data.items.length : data.items.filter((r) => levelOf(r) === id).length}</span>
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
<<<<<<< HEAD
                <b className="pay-name">{r.fullName}</b>
                <span className="pay-event">{r.eventTitle} · ₹{r.amount}{isJunior(r) && <span className="pay-badge-junior">JUNIOR · SCHOOL</span>}</span>
                <span className="pay-meta"><Mail size={13} /> {r.email}</span>
                <span className="pay-meta"><Phone size={13} /> {r.phone} · {isJunior(r) ? 'School: ' : ''}{r.college}{isJunior(r) && r.year ? ` · ${r.year}` : ''}</span>
=======
                <b className="pay-name">
                  {r.fullName}
                  {isTeam(r) && <span className="pay-team-chip"><Users size={12} /> Team of {r.teamSize}{r.teamName ? ` · ${r.teamName}` : ''}</span>}
                </b>
                <span className="pay-event">{r.eventTitle} · ₹{r.amount}{isTeam(r) ? ` (${r.teamSize} × ₹${Math.round(r.amount / r.teamSize)})` : ''}</span>
                {isTeam(r) ? (
                  <ul className="pay-members">
                    {r.members.map((m) => (
                      <li key={m.id}>
                        <b>{m.memberNo === 1 ? 'Leader' : `Member ${m.memberNo}`}: {m.fullName}</b>
                        <span><Mail size={12} /> {m.email}</span>
                        <span><Phone size={12} /> {m.phone} · {m.college} · {m.department} · {m.year}</span>
                        {m.ticketCode && <small className="pay-ticket">{m.ticketCode}</small>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <span className="pay-meta"><Mail size={13} /> {r.email}</span>
                    <span className="pay-meta"><Phone size={13} /> {r.phone} · {r.college}</span>
                  </>
                )}
>>>>>>> a22228a (team update)
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
                {r.ticketCode && !isTeam(r) && <small className="pay-ticket">{r.ticketCode}</small>}
                <div className="pay-btns">
                  {r.status !== 'PAID' && (r.status !== 'PENDING' || isJunior(r)) && (
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
