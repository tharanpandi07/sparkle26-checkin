import { useEffect, useState } from 'react'
import { UserPlus, CheckCircle2, Banknote, Smartphone, RotateCcw } from 'lucide-react'
import { api } from '../api'
import '../styles/onspot.css'

const EMPTY = { fullName: '', email: '', phone: '', college: '', department: '', year: '', eventId: '', paymentMode: 'CASH' }
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other']
const CLASSES = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'] // Junior events = school students
// Same pricing as the server (EventController): senior pass 100 (200 with Paper Presentation), junior free
const feeOf = (ev) => (!ev ? 0 : ev.fee ?? (ev.level === 'junior' ? 0 : ev.id === 'paper-presentation' ? 200 : 100))
const feeLabel = (fee) => (fee > 0 ? `₹${fee}` : 'Free')

// Walk-in registration at the venue desk -> saved in the database, ticket issued, marked present.
export default function OnSpot({ accessKey, onDone }) {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    api('/api/events').then((d) => setEvents(Array.isArray(d) ? d : [])).catch(() => setError('Cannot load events. Is the backend running?'))
  }, [])

  const selected = events.find((e) => e.id === form.eventId)
  const isJunior = selected?.level === 'junior'
  const yearOptions = isJunior ? CLASSES : YEARS
  const fee = feeOf(selected)
  const set = (e) => {
    const { name, value } = e.target
    setForm((f) => {
      const next = { ...f, [name]: value }
      if (name === 'eventId') { // Junior -> Class 8-12, Senior -> college years; clear a value that no longer fits
        const ev = events.find((x) => x.id === value)
        if (!(ev?.level === 'junior' ? CLASSES : YEARS).includes(next.year)) next.year = ''
      }
      return next
    })
  }
  const group = (level) => events.filter((e) => e.level === level)

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const r = await api('/api/attendance/onspot', { method: 'POST', key: accessKey, body: JSON.stringify(form) })
      setDone(r)
      onDone?.()
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot connect to the backend.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="work-card">
        <div className="onspot-done">
          <span className="onspot-done-icon"><CheckCircle2 size={34} /></span>
          <span className="mini-label">ON-SPOT REGISTRATION SAVED</span>
          <h2>{done.fullName}</h2>
          <p className="onspot-event">Registered for <b>{events.find((e) => e.id === done.eventId)?.title || 'selected event'}</b></p>
          <p>Saved in the database and marked <b>present</b>. Ticket mail goes to {done.email}.</p>
          <div className="onspot-ticket">
            <small>TICKET NUMBER</small>
            <b>{done.ticketCode}</b>
          </div>
          <p className="onspot-amount">
            {done.amount > 0 ? `Collected ₹${done.amount} (${done.paymentMode})` : 'Free event – nothing to collect'}
          </p>
          <button className="primary-btn" onClick={() => { setDone(null); setForm(EMPTY) }}>
            <RotateCcw size={16} /> Register next person
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="work-card">
      <div className="work-heading">
        <div>
          <span className="mini-label">WALK-IN</span>
          <h2>On-spot booking</h2>
          <p>Enter the participant's details, collect the fee, and register. They are marked present immediately.</p>
        </div>
        <span className="onspot-icon"><UserPlus size={22} /></span>
      </div>

      <form className="onspot-form" onSubmit={submit}>
        <label className="onspot-full">Event *
          <select name="eventId" value={form.eventId} onChange={set} required>
            <option value="">{events.length ? 'Select an event' : 'Loading events…'}</option>
            <optgroup label="Senior events">{group('senior').map((ev) => <option key={ev.id} value={ev.id}>{ev.title} · {feeLabel(feeOf(ev))}</option>)}</optgroup>
            <optgroup label="Junior events">{group('junior').map((ev) => <option key={ev.id} value={ev.id}>{ev.title} · {feeLabel(feeOf(ev))} · School students</option>)}</optgroup>
          </select>
        </label>
        <label>Full name *<input name="fullName" value={form.fullName} onChange={set} required minLength={2} maxLength={100} /></label>
        <label>Email (Gmail) *<input name="email" type="email" value={form.email} onChange={set} required maxLength={150} /></label>
        <label>Phone *<input name="phone" type="tel" value={form.phone} onChange={set} required pattern="[0-9+() \-]{8,20}" title="8–20 characters: digits, spaces, + ( ) -" /></label>
        <label>{isJunior ? 'School' : 'College'} *<input name="college" value={form.college} onChange={set} required maxLength={150} /></label>
        <label>Department *<input name="department" value={form.department} onChange={set} required maxLength={100} /></label>
        <label>{isJunior ? 'Class *' : 'Year *'}
          <select name="year" value={form.year} onChange={set} required disabled={!selected}>
            <option value="">{!selected ? 'Select an event first' : isJunior ? 'Select class (8 to 12)' : 'Select year'}</option>
            {yearOptions.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>

        {selected && fee > 0 && (
          <div className="onspot-full onspot-pay">
            <div className="onspot-collect">Collect <b>₹{fee}</b> from the participant</div>
            <div className="onspot-modes">
              <button type="button" className={form.paymentMode === 'CASH' ? 'mode active' : 'mode'} onClick={() => setForm((f) => ({ ...f, paymentMode: 'CASH' }))}><Banknote size={16} /> Cash</button>
              <button type="button" className={form.paymentMode === 'UPI' ? 'mode active' : 'mode'} onClick={() => setForm((f) => ({ ...f, paymentMode: 'UPI' }))}><Smartphone size={16} /> UPI / GPay</button>
            </div>
          </div>
        )}

        {error && <p className="app-error onspot-full">{error}</p>}

        <button className="primary-btn onspot-full" disabled={busy || !selected}>
          {busy ? 'Saving…' : fee > 0 ? `Received ₹${fee} – register & mark present` : 'Register & mark present'}
        </button>
      </form>
    </section>
  )
}
