'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from './lib/supabase'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading,  setLoading]  = useState(true)
  const [authed,   setAuthed]   = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthed(true)
        setLoading(false)
      } else {
        setAuthed(false)
        setLoading(false)
        if (pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthed(true)
      } else {
        setAuthed(false)
        if (pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0c0e14', color: '#64748b' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, background: '#6366f1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 auto 12px' }}>R</div>
        <div style={{ fontSize: 13 }}>Cargando...</div>
      </div>
    </div>
  )

  if (!authed && pathname === '/login') return <>{children}</>
  if (!authed) return null
  return <>{children}</>
}