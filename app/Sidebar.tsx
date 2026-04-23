'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from './lib/supabase'

const NAV_ITEMS = [
  { href: '/',            icon: '▦', label: 'Dashboard',   accent: false },
  { href: '/rutas',       icon: '⊞', label: 'Rutas',       accent: false },
  { href: '/rutas/nueva', icon: '+', label: 'Nueva Ruta',  accent: true  },
  { href: '/choferes',    icon: '◎', label: 'Choferes',    accent: false },
  { href: '/unidades',    icon: '◻', label: 'Unidades',    accent: false },
  { href: '/clientes',    icon: '◈', label: 'Clientes',    accent: false },
  { href: '/costos',      icon: '$', label: 'Costos',       accent: false },
  { href: '/historial',   icon: '≡', label: 'Historial',   accent: false },
  { href: '/paqueteria',  icon: '📦', label: 'Paquetería', accent: false },
]

export default function Sidebar() {
  const router   = useRouter()
  const pathname = usePathname()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: 210, background: '#131620',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#6366f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff' }}>R</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>RutaFlow</div>
            <div style={{ fontSize: 9, color: '#64748b', letterSpacing: '.06em' }}>PLANEADOR DE RUTAS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && !item.href.includes('nueva'))
          return (
            <a key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 8, marginBottom: 2,
              background: item.accent
                ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                : active ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: item.accent ? '#fff' : active ? '#818cf8' : '#94a3b8',
              fontSize: 13, textDecoration: 'none', transition: 'all .15s',
            }}>
              <span style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      {/* Usuario + Cerrar sesión */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>P</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0' }}>Patricio</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Administrador</div>
          </div>
          <button onClick={logout}
            title="Cerrar sesión"
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}