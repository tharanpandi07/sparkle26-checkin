import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, Keyboard, ScanLine, Square } from 'lucide-react'
import { ticketFromQR } from '../api'
import '../styles/scan.css'
export default function Scan({ onCode }) {
 const [manual,setManual]=useState(''), [scanning,setScanning]=useState(false), [error,setError]=useState('')
 const scanner=useRef(null)
 async function stop(){if(scanner.current){try{if(scanner.current.isScanning)await scanner.current.stop()}catch{} try{await scanner.current.clear()}catch{} scanner.current=null}setScanning(false)}
 async function start(){setError('');try{const s=new Html5Qrcode('sparkle-qr-reader');scanner.current=s;await s.start({facingMode:'environment'},{fps:10,qrbox:{width:240,height:240}},async decoded=>{const code=ticketFromQR(decoded);await stop();onCode(code)},()=>{});setScanning(true)}catch{setError('Camera access failed. Allow camera permission or enter the ticket code manually.')}}
 useEffect(()=>()=>{if(scanner.current?.isScanning)scanner.current.stop().catch(()=>{})},[])
 return <section className="work-card"><div className="work-heading"><div><span className="mini-label">STEP 01 · CAPTURE TICKET</span><h2>Scan participant QR</h2><p>Use the camera or enter the ticket code printed on the participant ticket.</p></div><span className="scan-icon"><ScanLine/></span></div><div className="scanner-area"><div id="sparkle-qr-reader"/><div className="scanner-actions">{!scanning?<button className="primary-btn" onClick={start}><Camera size={17}/> Open camera</button>:<button className="secondary-btn" onClick={stop}><Square size={15}/> Stop camera</button>}</div></div><div className="scan-divider"><span/> OR ENTER MANUALLY <span/></div><form className="ticket-entry" onSubmit={e=>{e.preventDefault();onCode(ticketFromQR(manual))}}><Keyboard size={18}/><input value={manual} onChange={e=>setManual(e.target.value)} placeholder="Example: SPK26-ABC123..." required/><button className="primary-btn">Continue</button></form>{error&&<p className="scan-error">{error}</p>}</section>
}
