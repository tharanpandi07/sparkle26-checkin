import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, Search, Users, Clock3, Mail, Phone, GraduationCap, FileSpreadsheet } from 'lucide-react'
import { api } from '../api'
import { downloadPresentExcel } from '../exportExcel'
import '../styles/present.css'
export default function Present({ result, accessKey }) {
 const [people,setPeople]=useState([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const loadPresent=useCallback(async()=>{setLoading(true);setError('');try{const data=await api('/api/attendance/present',{key:accessKey});setPeople(Array.isArray(data)?data:[])}catch(e){setError(e.message||'Unable to load present participants.')}finally{setLoading(false)}},[accessKey])
 useEffect(()=>{loadPresent()},[loadPresent])
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return people;return people.filter(p=>[p.name,p.email,p.college,p.phone,p.ticketCode,p.eventTitle].some(v=>String(v||'').toLowerCase().includes(q)))},[people,query])
 return <section className="present-page">
  {result&&<div className={`present-notice ${result.status==='CHECKED_IN'?'success':'warning'}`}><CheckCircle2 size={19}/><div><b>{result.status==='CHECKED_IN'?'Attendance marked successfully':'Participant was already checked in'}</b><span>{result.fullName} · {result.ticketCode}</span>{result.eventTitle&&<span className="present-event-line">Event: <b>{result.eventTitle}</b></span>}</div></div>}
  <div className="present-heading"><div><span className="mini-label">ATTENDANCE MANAGEMENT</span><h2>Present status</h2><p>Participants who have successfully checked in.</p></div><div className="present-btns"><button className="secondary-btn present-refresh" onClick={loadPresent} disabled={loading}><RefreshCw size={16}/> Refresh</button><button className="primary-btn" onClick={()=>downloadPresentExcel(people)} disabled={loading||people.length===0}><FileSpreadsheet size={16}/> Download Excel</button></div></div>
  <div className="present-list-summary"><div className="present-total-icon"><Users size={21}/></div><div><span>Total present</span><b>{people.length}</b></div><small>Verified check-ins</small></div>
  <div className="present-toolbar"><div className="present-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, event, Gmail, college or phone number..."/></div><span>{filtered.length} of {people.length} participants</span></div>
  {error&&<p className="present-error">{error}</p>}
  {loading?<div className="present-empty">Loading attendance records…</div>:filtered.length===0?<div className="present-empty">{people.length?'No participants match your search.':'No participants have checked in yet.'}</div>:
   <div className="present-table-wrap"><table className="present-table"><thead><tr><th>NAME</th><th>EVENT</th><th>GMAIL</th><th>COLLEGE</th><th>PHONE NO</th><th>CHECK-IN TIME</th></tr></thead><tbody>{filtered.map((p,i)=><tr key={p.id||p.ticketCode||i}><td><b className="participant-name">{p.name||'—'}</b><small>{p.ticketCode}</small></td><td><span className="present-event-chip">{p.eventTitle||'—'}</span></td><td><span className="present-cell-icon"><Mail size={14}/>{p.email||'—'}</span></td><td><span className="present-cell-icon"><GraduationCap size={15}/>{p.college||'—'}</span></td><td><span className="present-cell-icon"><Phone size={14}/>{p.phone||'—'}</span></td><td><span className="present-cell-icon"><Clock3 size={14}/>{p.checkedInAt?new Date(p.checkedInAt).toLocaleString():'—'}</span></td></tr>)}</tbody></table></div>}
 </section>
}
