import { useEffect, useState } from 'react'
import { api } from './api'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Scan from './components/Scan'
import Verification from './components/Verification'
import Present from './components/Present'
import Payments from './components/Payments'
import OnSpot from './components/OnSpot'
import './styles/global.css'
export default function App(){
 const [key,setKey]=useState(sessionStorage.getItem('sparkleVolunteerKey')||'')
 const [summary,setSummary]=useState(null),[page,setPage]=useState('scan'),[code,setCode]=useState(''),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function loadSummary(accessKey){const data=await api('/api/attendance/summary',{key:accessKey});setSummary(data)}
 useEffect(()=>{if(key)loadSummary(key).catch(()=>{sessionStorage.removeItem('sparkleVolunteerKey');setKey('')})},[])
 async function login(value){setError('');try{await loadSummary(value);sessionStorage.setItem('sparkleVolunteerKey',value);setKey(value)}catch(e){setError(e.message==='Failed to fetch'?'Cannot connect to the backend. Make sure Spring Boot is running.':'Invalid volunteer access key. Check the key with the event administrator.')}}
 function logout(){sessionStorage.removeItem('sparkleVolunteerKey');setKey('');setSummary(null);setCode('');setResult(null);setPage('scan')}
 async function confirmAttendance(){setBusy(true);try{const data=await api('/api/attendance/check-in',{method:'POST',key,body:JSON.stringify({ticketCode:code})});setResult(data);setPage('present');await loadSummary(key)}catch(e){setError(e.message)}finally{setBusy(false)}}
 if(!key)return <Login onLogin={login} error={error}/>
 return <Dashboard summary={summary} page={page} setPage={p=>{setError('');setPage(p);if(p==='scan'){setCode('');setResult(null)}}} onLogout={logout}>
  {page==='scan'&&<Scan onCode={value=>{setCode(value);setError('');setPage('verification')}}/>}
  {page==='verification'&&<><Verification code={code} onBack={()=>setPage('scan')} onConfirm={confirmAttendance}/>{busy&&<div className="busy-overlay">Saving attendance…</div>}{error&&<p className="app-error">{error}</p>}</>}
  {page==='present'&&<Present result={result} accessKey={key}/>}
  {page==='payments'&&<Payments/>}
  {page==='onspot'&&<OnSpot accessKey={key} onDone={()=>loadSummary(key).catch(()=>{})}/>}
 </Dashboard>
}
