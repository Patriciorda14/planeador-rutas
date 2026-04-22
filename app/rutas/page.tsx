'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ESTATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  borrador:    { label: 'Borrador',    color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
  asignada:    { label: 'Asignada',    color: '#60a5fa', bg: 'rgba(96,165,250,.12)'  },
  en_transito: { label: 'En Tránsito', color: '#fbbf24', bg: 'rgba(251,191,36,.12)'  },
  completada:  { label: 'Completada',  color: '#34d399', bg: 'rgba(52,211,153,.12)'  },
  cerrada:     { label: 'Cerrada',     color: '#a78bfa', bg: 'rgba(167,139,250,.12)' },
}

const ZONA_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  congelado:   { label: 'Congelado',   color: '#60a5fa', icon: '❄' },
  refrigerado: { label: 'Refrigerado', color: '#34d399', icon: '🌡' },
  ambiente:    { label: 'Ambiente',    color: '#fbbf24', icon: '☀' },
}

type Ruta = {
  id: string
  folio: string
  nombre: string
  estatus: string
  fecha_salida: string
  origen: string
  km_estimados: number
  costo_presupuesto: number
  costo_real: number
  choferes?: { nombre_completo: string }
  unidades?: { placa: string }
  paradas?: { zona_temp: string }[]
}

export default function RutasPage() {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('todos')

  useEffect(() => {
    fetchRutas()
  }, [])

  async function fetchRutas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rutas')
      .select(`*, choferes(nombre_completo), unidades(placa), paradas(zona_temp)`)
      .order('creado_en', { ascending: false })
    if (!error && data) setRutas(data)
    setLoading(false)
  }

  const filtradas = rutas.filter(r => {
    const ms = !search || r.nombre.toLowerCase().includes(search.toLowerCase()) || r.folio.toLowerCase().includes(search.toLowerCase())
    const me = filtroEstatus === 'todos' || r.estatus === filtroEstatus
    return ms && me
  })

  function fmt(n: number | null) { return n != null ? `$${Number(n).toLocaleString('es-MX')}` : '—' }
  function fmtKm(n: number | null) { return n ? `${Number(n).toLocaleString('es-MX')} km` : '—' }

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Rutas</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{rutas.length} rutas en el sistema</p>
        </div>
        <a href="/rutas/nueva" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}>
          + Nueva ruta
        </a>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total rutas',   value: rutas.length,                                              color: '#e2e8f0' },
            { label: 'En tránsito',   value: rutas.filter(r => r.estatus === 'en_transito').length,     color: '#fbbf24' },
            { label: 'Borradores',    value: rutas.filter(r => r.estatus === 'borrador').length,        color: '#94a3b8' },
            { label: 'Completadas',   value: rutas.filter(r => r.estatus === 'completada').length,      color: '#34d399' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', flex: 1 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            placeholder="Buscar por folio o nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: 300, background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none' }}
          />
          <select
            value={filtroEstatus}
            onChange={e => setFiltroEstatus(e.target.value)}
            style={{ width: 160, background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none' }}
          >
            <option value="todos">Todos los estatus</option>
            {Object.entries(ESTATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando rutas...</div>
          ) : filtradas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⊞</div>
              <div style={{ fontWeight: 500, marginBottom: 4, color: '#94a3b8' }}>No hay rutas todavía</div>
              <div style={{ fontSize: 12 }}>Crea tu primera ruta con el botón de arriba</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1a1e2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Folio', 'Ruta', 'Estatus', 'Chofer / Unidad', 'Km', 'Costo', ''].map(h => (
                    <th key={h} style={{ padding: '9px 13px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map(r => {
                  const est = ESTATUS_CONFIG[r.estatus] || {}
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                      <td style={{ padding: '10px 13px', fontFamily: 'Syne, sans-serif', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{r.folio}</td>
                      <td style={{ padding: '10px 13px' }}>
                        <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.nombre}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{r.origen}</div>
                      </td>
                      <td style={{ padding: '10px 13px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: est.bg, color: est.color, fontSize: 11, fontWeight: 600 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: est.color }}/>
                          {est.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 13px' }}>
                        {r.choferes
                          ? <><div style={{ fontSize: 12, color: '#e2e8f0' }}>{r.choferes.nombre_completo}</div><div style={{ fontSize: 10, color: '#64748b' }}>{r.unidades?.placa}</div></>
                          : <span style={{ color: '#64748b', fontSize: 12 }}>Sin asignar</span>}
                      </td>
                      <td style={{ padding: '10px 13px', color: '#94a3b8', fontSize: 12 }}>{fmtKm(r.km_estimados)}</td>
                      <td style={{ padding: '10px 13px', fontSize: 12, fontWeight: 500, color: '#e2e8f0' }}>{fmt(r.costo_presupuesto)}</td>
                      <td style={{ padding: '10px 13px' }}>
                        <a href={`/rutas/${r.id}`} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}>Ver</a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>Mostrando {filtradas.length} de {rutas.length} rutas</div>
      </div>
    </div>
  )
}