import * as XLSX from 'xlsx'
import { downloadWorkbook, downloadCsv, stamp } from './download'

const when = (v) => (v ? new Date(v).toLocaleString() : '')
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event'

function autoWidth(ws, rows, headers) {
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(40, rows.reduce((m, r) => Math.max(m, String(r[h] ?? '').length), h.length) + 2),
  }))
}

// ---------- Present (checked-in) participants ----------
const presentRows = (people) =>
  people.map((p, i) => ({
    'S.No': i + 1,
    Name: p.name || '',
    Email: p.email || '',
    Phone: p.phone || '',
    College: p.college || '',
    Department: p.department || '',
    Year: p.year || '',
    Event: p.eventTitle || '',
    Team: p.teamSize > 1 ? `${p.teamName || 'Team'} (${p.memberNo || 1}/${p.teamSize})` : '',
    'Ticket code': p.ticketCode || '',
    Type: p.source === 'ONSPOT' ? 'On-spot' : 'Online',
    'Amount (₹)': p.amount ?? '',
    'Payment mode': p.source === 'ONSPOT' ? p.paymentMode || '' : 'GPay QR',
    'Check-in time': when(p.checkedInAt),
  }))

export function downloadPresentExcel(people) {
  const rows = presentRows(people)
  const name = `sparkle26-present-${stamp()}`
  try {
    const ws = XLSX.utils.json_to_sheet(rows)
    autoWidth(ws, rows, Object.keys(rows[0] || { Name: '' }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Present')
    downloadWorkbook(wb, `${name}.xlsx`)
  } catch (e) {
    console.error('xlsx export failed, falling back to CSV', e)
    downloadCsv(rows, `${name}.csv`)
  }
}

// ---------- Per-event reports (for event coordinators) ----------
// paid    : approved online registrations  (/api/admin/payments?status=PAID)
// present : checked-in list                (/api/attendance/present)
export function buildEventReports(events, paid, present) {
  const presentByTicket = new Map(present.filter((p) => p.ticketCode).map((p) => [p.ticketCode, p]))
  // a registration is a cart: it belongs to every event it contains
  const idsOf = (r) => (Array.isArray(r.eventIds) && r.eventIds.length ? r.eventIds : r.eventId ? [r.eventId] : [])
  const matches = (ev, r) => {
    const ids = idsOf(r)
    return ids.length ? ids.includes(ev.id) : norm(r.eventTitle) === norm(ev.title)
  }

  return events.map((ev) => {
    const rows = []
    const seen = new Set()

    paid.filter((r) => matches(ev, r)).forEach((r) => {
      const pr = presentByTicket.get(r.ticketCode)
      const onspot = r.source === 'ONSPOT'
      if (r.ticketCode) seen.add(r.ticketCode)
      rows.push({
        name: r.fullName, email: r.email, phone: r.phone, college: r.college,
        department: r.department, year: r.year, ticketCode: r.ticketCode,
        type: onspot ? 'On-spot' : 'Online', amount: r.amount, mode: onspot ? r.paymentMode : 'GPay QR', utr: r.utr,
        payStatus: onspot ? 'Paid at desk' : 'Approved', present: !!pr, checkedInAt: pr?.checkedInAt,
        teamKey: r.teamCode || '', teamName: r.teamName || '', teamSize: r.teamSize || 0, memberNo: r.memberNo || 0,
      })
    })

    // checked-in people not in the approved list (on-spot, or online without a payment record)
    present.filter((p) => matches(ev, p) && !seen.has(p.ticketCode)).forEach((p) => {
      const onspot = p.source === 'ONSPOT'
      rows.push({
        name: p.name, email: p.email, phone: p.phone, college: p.college,
        department: p.department, year: p.year, ticketCode: p.ticketCode,
        type: onspot ? 'On-spot' : 'Online', amount: p.amount,
        mode: onspot ? p.paymentMode : 'GPay QR', utr: '',
        payStatus: onspot ? 'Paid at desk' : 'Approved', present: true, checkedInAt: p.checkedInAt,
        teamKey: p.teamName ? `n:${p.teamName}` : '', teamName: p.teamName || '', teamSize: p.teamSize || 0, memberNo: p.memberNo || 0,
      })
    })

    // keep every team together (member 1, 2, 3 ...) - individuals stay in their original order
    const groups = new Map()
    rows.forEach((r, i) => {
      const k = r.teamKey || `solo-${i}`
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(r)
    })
    const ordered = [...groups.values()].flatMap((g) => g.sort((x, y) => x.memberNo - y.memberNo))

    const junior = ev.level === 'junior'
    const sheetRows = ordered.map((r, i) => ({
      'S.No': i + 1,
      Name: r.name || '',
      Email: r.email || '',
      Phone: r.phone || '',
      [junior ? 'School' : 'College']: r.college || '',
      Department: r.department || '',
      [junior ? 'Class' : 'Year']: r.year || '',
      'Team name': r.teamSize > 1 ? r.teamName : '',
      'Member no.': r.teamSize > 1 ? `${r.memberNo || ''}${r.memberNo === 1 ? ' (Leader)' : ''}` : '',
      'Team size': r.teamSize > 1 ? r.teamSize : '',
      'Ticket code': r.ticketCode || '',
      Registration: r.type,
      'Pass fee paid (₹)': r.amount ?? '',
      'Payment mode': r.mode || '',
      'UTR / Txn ID': r.utr || '',
      'Payment status': r.payStatus,
      Attendance: r.present ? 'Present' : 'Absent',
      'Check-in time': when(r.checkedInAt),
    }))

    // one row per team: team name + each member's name in a separate cell
    const teams = [...groups.values()].filter((g) => g[0].teamSize > 1).map((g) => {
      const row = {
        'Team name': g[0].teamName,
        'Team size': g[0].teamSize,
        Leader: g[0].name || '',
        'Leader phone': g[0].phone || '',
        'Leader email': g[0].email || '',
        [junior ? 'School' : 'College']: g[0].college || '',
        'Fee paid (₹)': g.reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
      }
      for (let n = 0; n < 5; n++) row[`Member ${n + 1}`] = g[n]?.name || ''
      row['Present'] = `${g.filter((m) => m.present).length}/${g[0].teamSize}`
      return row
    })

    return {
      event: ev,
      rows: sheetRows,
      teams,
      total: sheetRows.length,
      present: ordered.filter((r) => r.present).length,
    }
  })
}

// Unique participants across all events (one pass can cover several events, so never sum per-event money)
export function summarizeReports(paid, present) {
  const money = new Map()
  paid.forEach((r) => money.set(r.ticketCode || `p${r.id}`, Number(r.amount) || 0))
  present.forEach((p) => { if (!money.has(p.ticketCode)) money.set(p.ticketCode, Number(p.amount) || 0) })
  const presentSet = new Set(present.map((p) => p.ticketCode))
  return {
    registered: money.size,
    present: [...money.keys()].filter((k) => presentSet.has(k)).length,
    collected: [...money.values()].reduce((s, v) => s + v, 0),
  }
}

const HEADERS = ['S.No', 'Name', 'Email', 'Phone', 'College', 'Department', 'Year', 'Team name', 'Member no.', 'Team size', 'Ticket code',
  'Registration', 'Pass fee paid (₹)', 'Payment mode', 'UTR / Txn ID', 'Payment status', 'Attendance', 'Check-in time']

function eventSheet(rep) {
  const ws = XLSX.utils.json_to_sheet(rep.rows, { header: undefined })
  if (!rep.rows.length) {
    // header-only sheet so coordinators still get the template
    const head = rep.event.level === 'junior'
      ? HEADERS.map((h) => (h === 'College' ? 'School' : h === 'Year' ? 'Class' : h))
      : HEADERS
    XLSX.utils.sheet_add_aoa(ws, [head], { origin: 'A1' })
    ws['!cols'] = head.map((h) => ({ wch: h.length + 4 }))
  } else {
    autoWidth(ws, rep.rows, Object.keys(rep.rows[0]))
  }
  return ws
}

const safeSheetName = (title, used) => {
  let base = String(title || 'Event').replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Event'
  let name = base, n = 2
  while (used.has(name.toLowerCase())) { const suffix = ` (${n++})`; name = base.slice(0, 31 - suffix.length) + suffix }
  used.add(name.toLowerCase())
  return name
}

function teamsSheet(teams) {
  const ws = XLSX.utils.json_to_sheet(teams)
  autoWidth(ws, teams, Object.keys(teams[0]))
  return ws
}

// one .xlsx per event (+ a "Teams" sheet when the event has teams)
export function downloadEventReport(rep) {
  const wb = XLSX.utils.book_new()
  const used = new Set(['teams'])
  XLSX.utils.book_append_sheet(wb, eventSheet(rep), safeSheetName(rep.event.title, used))
  if (rep.teams?.length) XLSX.utils.book_append_sheet(wb, teamsSheet(rep.teams), 'Teams')
  downloadWorkbook(wb, `sparkle26-${slug(rep.event.title)}-${stamp()}.xlsx`)
}

// one workbook, one sheet per event (+ summary)
export function downloadAllEventsWorkbook(reports, totals) {
  const wb = XLSX.utils.book_new()
  const summary = reports.map((r, i) => ({
    'S.No': i + 1,
    Event: r.event.title,
    Level: r.event.level === 'junior' ? 'Junior (School)' : 'Senior',
    Teams: r.teams.length,
    Registered: r.total,
    Present: r.present,
    Absent: r.total - r.present,
  }))
  if (totals) summary.push({ 'S.No': '', Event: 'ALL EVENTS (unique participants)', Level: '', Teams: '', Registered: totals.registered, Present: totals.present, Absent: totals.registered - totals.present })
  const sws = XLSX.utils.json_to_sheet(summary)
  autoWidth(sws, summary, Object.keys(summary[0] || { Event: '' }))
  XLSX.utils.book_append_sheet(wb, sws, 'Summary')
  const used = new Set(['summary'])
  const allTeams = reports.flatMap((r) => r.teams.map((t) => ({ Event: r.event.title, ...t })))
  if (allTeams.length) XLSX.utils.book_append_sheet(wb, teamsSheet(allTeams), 'Teams')
  used.add('teams')
  reports.forEach((r) => XLSX.utils.book_append_sheet(wb, eventSheet(r), safeSheetName(r.event.title, used)))
  downloadWorkbook(wb, `sparkle26-all-events-${stamp()}.xlsx`)
}
