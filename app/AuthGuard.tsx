'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from './lib/supabase'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authed' | 'unauthed'>('loading')
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? 'authed' : 'unauthed')
    })
  }, [])

  if (status === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0c0e14' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: 40, height: 40, background: '#6366f1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 auto 12px' }}>R</div>
        Cargando...
      </div>
    </div>
  )

  if (status === 'unauthed' && pathname !== '/login') {
    if (typeof window !== 'undefined') window.location.replace('/login')
    return null
  }

  return <>{children}</>
}