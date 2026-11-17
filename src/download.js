import * as XLSX from 'xlsx'

// Reliable browser download (XLSX.writeFile silently fails in some browsers / in-app webviews)
export function saveBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1500)
}

export function downloadWorkbook(wb, filename) {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveBlob(
    filename,
    new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
}

// CSV fallback if the xlsx download ever fails
export function downloadCsv(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws)
  saveBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
}

export const stamp = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
