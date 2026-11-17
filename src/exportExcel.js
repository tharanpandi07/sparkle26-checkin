import * as XLSX from 'xlsx'

// Present (checked-in) participants -> .xlsx download
export function downloadPresentExcel(people) {
  const rows = people.map((p, i) => ({
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
    'Check-in time': p.checkedInAt ? new Date(p.checkedInAt).toLocaleString() : '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const headers = Object.keys(rows[0] || { Name: '' })
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)) + 2),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Present')
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  XLSX.writeFile(wb, `sparkle26-present-${stamp}.xlsx`)
}
