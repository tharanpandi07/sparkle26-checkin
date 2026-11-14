
import { useState } from 'react'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import '../styles/login.css'

export default function Login({ onLogin, error }) {
  const [key, setKey] = useState('')

  return (
    <div className="login-screen">

      {/* FULL SCREEN BACKGROUND */}
      <img
        src="/hero.png"
        className="login-bg-image"
        alt="University Background"
      />

      <div className="login-bg-overlay"></div>

      {/* LEFT CONTENT */}
      <div className="login-art">

        <div className="login-mark">
          <img
            src="/sparkle-logo.png"
            alt="SPARKLE 26"
            className="login-logo"
          />
        </div>

        <p className="eyebrow">IDEAS IGNITE TOMORROW</p>

        <h1>
          Make every<br />
          <em>moment count.</em>
        </h1>

        <p className="login-copy">
          A smarter, faster check-in experience for SPARKLE'26.
        </p>

        <div className="orbit orbit-one"></div>
        <div className="orbit orbit-two"></div>

      </div>

      {/* RIGHT LOGIN CARD */}
      <form
        className="login-card"
        onSubmit={e => {
          e.preventDefault()
          onLogin(key.trim())
        }}
      >

        <span className="mini-label">VOLUNTEER ACCESS</span>

        <h2>Welcome back</h2>

        <p>
          Enter the secure access key provided by your event administrator.
        </p>

        <label>Volunteer access key</label>

        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="Enter your access key"
          required
          autoComplete="current-password"
        />

        {error && <div className="inline-error">{error}</div>}

        <button type="submit" className="primary-btn">
          Continue <ArrowRight size={17} />
        </button>

        <small>
          <ShieldCheck size={14} />
          Protected event operations
        </small>

      </form>

    </div>
  )
}
