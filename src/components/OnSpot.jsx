import { useEffect, useMemo, useState } from 'react'
import { UserPlus, CheckCircle2, Banknote, Smartphone, RotateCcw, Check, Users } from 'lucide-react'
import { api } from '../api'
import '../styles/onspot.css'

const EMPTY = { fullName: '', email: '', phone: '', college: '', department: '', year: '', paymentMode: 'CASH' }
const EMPTY_MEMBER = { fullName: '', email: '', phone: '' }
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other']
const CLASSES = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'] // Junior events = school students
const MAX_TEAM = 5
const PAPER_ID = 'paper-presentation'

// Same pricing as the server (EventController.feeFor) - PER MEMBER:
// Paper Presentation in the selection = 200, any other senior event = 100, junior only = free
const feePerMember = (selected) => {
  if (!selected.some((e) => e.level === 'senior')) return 0
  return selected.some((e) => e.id === PAPER_ID) ? 200 : 100
}

// Walk-in registration at the venue desk (single person or a team of up to 5)
// -> saved in the database, a separate ticket per member, everyone marked present.
export default function OnSpot({ accessKey, onDone }) {
  const [events, setEvents] = useState([])
  const [eventIds, setEventIds] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [teamName, setTeamName] = useState('')
  const [size, setSize] = useState(1)
  const [members, setMembers] = useState([]) // team members 2..size
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    api('/api/events').then((d) => setEvents(Array.isArray(d) ? d : [])).catch(() => setError('Cannot load events. Is the backend running?'))
  }, [])

  const selected = useMemo(() => events.filter((e) => eventIds.includes(e.id)), [events, eventIds])
  const level = selected.length ? selected[0].level : '' // a cart is either senior or junior
  const isJunior = level === 'junior'
  const yearOptions = isJunior ? CLASSES : YEARS
  const perMember = feePerMember(selected)
  const total = perMember * size
  const names = (level) => events.filter((e) => e.level === level)

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  function toggleEvent(ev) {
    setEventIds((ids) => {
      const next = ids.includes(ev.id) ? ids.filter((x) => x !== ev.id) : [...ids, ev.id]
      const first = events.find((x) => x.id === next[0])
      // Junior -> Class 8-12, Senior -> college years; clear a value that no longer fits
      setForm((f) => (first && !(first.level === 'junior' ? CLASSES : YEARS).includes(f.year) ? { ...f, year: '' } : f))
      return next
    })
  }

  function changeSize(n) {
    setSize(n)
    setMembers((m) => Array.from({ length: n - 1 }, (_, i) => m[i] || { ...EMPTY_MEMBER }))
  }
  const setMember = (i, key, value) => setMembers((m) => m.map((x, j) => (j === i ? { ...x, [key]: value } : x)))

  function reset() {
    setDone(null); setForm(EMPTY); setEventIds([]); setTeamName(''); setSize(1); setMembers([]); setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    if (!eventIds.length) { setError('Select at least one event.'); return }
    if (size > 1 && !teamName.trim()) { setError('Enter the team name.'); return }
    setBusy(true)
    setError('')
    try {
      const body = { ...form, eventIds, teamName: size > 1 ? teamName.trim() : '', members: size > 1 ? members : [] }
      const r = await api('/api/attendance/onspot', { method: 'POST', key: accessKey, body: JSON.stringify(body) })
      setDone(r)
      onDone?.()
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot connect to the backend.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    const list = done.members || []
    return (
      <section className="work-card">
        <div className="onspot-done">
          <span className="onspot-done-icon"><CheckCircle2 size={34} /></span>
          <span className="mini-label">ON-SPOT REGISTRATION SAVED</span>
          <h2>{done.team ? done.teamName : list[0]?.fullName}</h2>
          <p className="onspot-event">
            {done.team ? `Team of ${done.teamSize} · ` : ''}Registered for <b>{list[0] ? names2(events, list[0].eventIds) : 'selected events'}</b>
          </p>
          <p>Saved in the database and marked <b>present</b>. A separate ticket mail goes to {done.team ? 'each member' : list[0]?.email}.</p>
          <div className="onspot-tickets">
            {list.map((m) => (
              <div className="onspot-ticket" key={m.ticketCode}>
                <small>{done.team ? `MEMBER ${m.memberNo}${m.memberNo === 1 ? ' (LEADER)' : ''} · ${m.fullName.toUpperCase()}` : 'TICKET NUMBER'}</small>
                <b>{m.ticketCode}</b>
              </div>
            ))}
          </div>
          <p className="onspot-amount">
            {done.totalAmount > 0
              ? `Collected ₹${done.totalAmount} (${done.paymentMode})${done.team ? ` = ${done.teamSize} × ₹${done.feePerMember}` : ''}`
              : 'Free event – nothing to collect'}
          </p>
          <button className="primary-btn" onClick={reset}><RotateCcw size={16} /> Register next person / team</button>
        </div>
      </section>
    )
  }

  const chip = (ev) => {
    const on = eventIds.includes(ev.id)
    const blocked = !!level && ev.level !== level // senior + junior cannot be mixed
    return (
      <button type="button" key={ev.id} className={`ev-chip${on ? ' on' : ''}`} disabled={blocked} onClick={() => toggleEvent(ev)}
        title={blocked ? 'Senior and Junior events cannot be combined' : ''}>
        <span className="ev-tick">{on && <Check size={12} />}</span>
        {ev.icon ? `${ev.icon} ` : ''}{ev.title}
        {ev.id === PAPER_ID && <em>₹200 / member</em>}
      </button>
    )
  }

  return (
    <section className="work-card">
      <div className="work-heading">
        <div>
          <span className="mini-label">WALK-IN</span>
          <h2>On-spot booking</h2>
          <p>Click the events, add the team members, collect the fee and register. Every member gets a separate ticket and is marked present.</p>
        </div>
        <span className="onspot-icon"><UserPlus size={22} /></span>
      </div>

      <form className="onspot-form" onSubmit={submit}>
        <div className="onspot-full">
          <div className="onspot-sub">Events * <small>(click to add · Senior ₹100 per member, Paper Presentation ₹200 per member, Junior free)</small></div>
          <div className="ev-group-title">Senior events</div>
          <div className="ev-chips">{events.length ? names('senior').map(chip) : <span className="onspot-muted">Loading events…</span>}</div>
          <div className="ev-group-title">Junior events <small>(school students, Class 8–12)</small></div>
          <div className="ev-chips">{names('junior').map(chip)}</div>
        </div>

        <div className="onspot-full">
          <div className="onspot-sub"><Users size={14} /> Team size * <small>(up to {MAX_TEAM} members, 1 = individual)</small></div>
          <div className="size-btns">
            {Array.from({ length: MAX_TEAM }, (_, i) => i + 1).map((n) => (
              <button type="button" key={n} className={size === n ? 'size-btn active' : 'size-btn'} onClick={() => changeSize(n)}>{n}</button>
            ))}
          </div>
        </div>

        {size > 1 && (
          <label className="onspot-full">Team name *
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={80} required />
          </label>
        )}

        <div className="onspot-full onspot-sub">{size > 1 ? 'Member 1 – team leader' : 'Participant details'}</div>
        <label>Full name *<input name="fullName" value={form.fullName} onChange={set} required minLength={2} maxLength={100} /></label>
        <label>Email (Gmail) *<input name="email" type="email" value={form.email} onChange={set} required maxLength={150} /></label>
        <label>Phone *<input name="phone" type="tel" value={form.phone} onChange={set} required pattern="[0-9+() \-]{8,20}" title="8–20 characters: digits, spaces, + ( ) -" /></label>
        <label>{isJunior ? 'School' : 'College'} *<input name="college" value={form.college} onChange={set} required maxLength={150} /></label>
        <label>Department *<input name="department" value={form.department} onChange={set} required maxLength={100} /></label>
        <label>{isJunior ? 'Class *' : 'Year *'}
          <select name="year" value={form.year} onChange={set} required disabled={!selected.length}>
            <option value="">{!selected.length ? 'Select an event first' : isJunior ? 'Select class (8 to 12)' : 'Select year'}</option>
            {yearOptions.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>

        {members.map((m, i) => (
          <div className="onspot-full member-card" key={i}>
            <div className="onspot-sub">Member {i + 2} <small>(same {isJunior ? 'school' : 'college'} / department / {isJunior ? 'class' : 'year'} as the leader)</small></div>
            <div className="member-grid">
              <label>Full name *<input value={m.fullName} onChange={(e) => setMember(i, 'fullName', e.target.value)} required minLength={2} maxLength={100} /></label>
              <label>Email (own ticket goes here) *<input type="email" value={m.email} onChange={(e) => setMember(i, 'email', e.target.value)} required maxLength={150} /></label>
              <label>Phone *<input type="tel" value={m.phone} onChange={(e) => setMember(i, 'phone', e.target.value)} required pattern="[0-9+() \-]{8,20}" title="8–20 characters: digits, spaces, + ( ) -" /></label>
            </div>
          </div>
        ))}

        {selected.length > 0 && perMember > 0 && (
          <div className="onspot-full onspot-pay">
            <div className="onspot-collect">
              Collect <b>₹{total}</b> {size > 1 ? <span>({size} members × ₹{perMember})</span> : 'from the participant'}
            </div>
            <div className="onspot-modes">
              <button type="button" className={form.paymentMode === 'CASH' ? 'mode active' : 'mode'} onClick={() => setForm((f) => ({ ...f, paymentMode: 'CASH' }))}><Banknote size={16} /> Cash</button>
              <button type="button" className={form.paymentMode === 'UPI' ? 'mode active' : 'mode'} onClick={() => setForm((f) => ({ ...f, paymentMode: 'UPI' }))}><Smartphone size={16} /> UPI / GPay</button>
            </div>
          </div>
        )}

        {error && <p className="app-error onspot-full">{error}</p>}

        <button className="primary-btn onspot-full" disabled={busy || !selected.length}>
          {busy ? 'Saving…' : total > 0 ? `Received ₹${total} – register ${size > 1 ? `${size} members` : ''} & mark present` : `Register${size > 1 ? ` ${size} members` : ''} & mark present`}
        </button>
      </form>
    </section>
  )
}

// "Hackathon, Chess" for the done screen
function names2(events, ids) {
  const t = (ids || []).map((id) => events.find((e) => e.id === id)?.title).filter(Boolean)
  return t.length ? t.join(', ') : 'selected events'
}
