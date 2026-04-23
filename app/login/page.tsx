'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    if (!email || !password) { setError('Completa todos los campos'); return }
    setLoading(true)
    setError('')

    const { error: e } = await supabase.auth.signInWithPassword({ email, password })

    if (e) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    window.location.replace('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0e14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: '#6366f1', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif', margin: '0 auto 14px' }}>R</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: '#e2e8f0' }}>RutaFlow</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Planeador de rutas</div>
        </div>

        <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 32 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#e2e8f0', marginBottom: 6 }}>Iniciar sesión</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Ingresa tus credenciales para continuar</div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width: '100%', background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width: '100%', background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Syne, sans-serif', marginTop: 4 }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#64748b' }}>
          ¿Olvidaste tu contraseña? Contacta al administrador
        </div>
      </div>
    </div>
  )
}