'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Envio = {
  id: string
  folio: string
  estatus: string
  paqueteria: string
  numero_guia: string
  fecha_envio: string
  fecha_entrega_est: string
  fecha_entrega_real: string
  destino_ciudad: string
  destino_estado: string
  peso_kg: number
  costo_envio: number
  valor_carga: number
  empaque_pasivo: boolean
  notas: string
}

const ESTATUS: Record<string, { label: string; color: string; bg: string; next?: string; nextLabel?: string }> = {
  pendiente:    { label: 'Pendiente',    color: '#94a3b8', bg: 'rgba(148,163,184,.12)', next: 'recolectado',  nextLabel: 'Recolectado' },
  recolectado:  { label: 'Recolectado',  color: '#60a5fa', bg: 'rgba(96,165,250,.12)',  next: 'en_transito',  nextLabel: 'En tránsito' },
  en_transito:  { label: 'En tránsito',  color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  next: 'entregado',    nextLabel: 'Entregado' },
  entregado:    { label: 'Entregado',    color: '#34d399', bg: 'rgba(52,211,153,.12)' },
}

const CICLO = ['pendiente', 'recolectado', 'en_transito', 'entregado']

function fmt(n: number | null) {
  return n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'
}
function fmtFecha(f: string) {
  if (!f) return '—'
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PaqueteriaPage() {
  const [envios,     setEnvios]     = useState<Envio[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filtroEst,  setFiltroEst]  = useState('todos')
  const [cambiando,  setCambiando]  = useState<string | null>(null)

  useEffect(() => { fetchEnvios() }, [])

  async function fetchEnvios() {
    setLoading(true)
    const { data } = await supabase
      .from('envios')
      .select('*')
      .order('creado_en', { ascending: false })
    if (data) setEnvios(data)
    setLoading(false)
  }

  async function avanzarEstatus(e: Envio) {
    const cfg = ESTATUS[e.estatus]
    if (!cfg?.next) return
    setCambiando(e.id)
    const upd: Record<string, string> = { estatus: cfg.next }
    if (cfg.next === 'entregado') upd.fecha_entrega_real = new Date().toISOString().split('T')[0]
    await supabase.from('envios').update(upd).eq('id', e.id)
    setEnvios(es => es.map(x => x.id === e.id ? { ...x, estatus: cfg.next! } : x))
    setCambiando(null)
  }

  const filtrados = envios.filter(e => {
    const ms = !search ||
      e.folio.toLowerCase().includes(search.toLowerCase()) ||
      (e.paqueteria || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.destino_ciudad || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.numero_guia || '').toLowerCase().includes(search.toLowerCase())
    const me = filtroEst === 'todos' || e.estatus === filtroEst
    return ms && me
  })

  const stats = {
    total:       envios.length,
    en_transito: envios.filter(e => e.estatus === 'en_transito').length,
    entregados:  envios.filter(e => e.estatus === 'entregado').length,
    costo_total: envios.reduce((s, e) => s + (e.costo_envio || 0), 0),
    valor_total: envios.reduce((s, e) => s + (e.valor_carga || 0), 0),
  }
  const margen_total = stats.valor_total * 0.0125
  const rentabilidad = margen_total - stats.costo_total

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Paquetería</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{envios.length} envíos registrados</p>
        </div>
        <a href="/paqueteria/nuevo"
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          + Nuevo envío
        </a>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total envíos',   value: stats.total,                color: '#e2e8f0' },
            { label: 'En tránsito',    value: stats.en_transito,          color: '#fbbf24' },
            { label: 'Entregados',     value: stats.entregados,           color: '#34d399' },
            { label: 'Costo total',    value: fmt(stats.costo_total),     color: '#ef4444' },
            { label: 'Rentabilidad',   value: fmt(rentabilidad),          color: rentabilidad >= 0 ? '#34d399' : '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Panel rentabilidad */}
        {stats.valor_total > 0 && (
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Valor total carga</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{fmt(stats.valor_total)}</div>
            </div>
            <div style={{ color: '#64748b', fontSize: 18 }}>×</div>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Margen (1.25%)</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#10b981' }}>{fmt(margen_total)}</div>
            </div>
            <div style={{ color: '#64748b', fontSize: 18 }}>−</div>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Costo paquetería</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{fmt(stats.costo_total)}</div>
            </div>
            <div style={{ color: '#64748b', fontSize: 18 }}>=</div>
            <div style={{ background: rentabilidad >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${rentabilidad >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 10, padding: '10px 16px' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Rentabilidad neta</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: rentabilidad >= 0 ? '#34d399' : '#ef4444' }}>{fmt(rentabilidad)}</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input placeholder="Buscar folio, guía, paquetería, destino..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: 360, background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none' }} />
          <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)}
            style={{ width: 170, background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none' }}>
            <option value="todos">Todos los estatus</option>
            {Object.entries(ESTATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando envíos...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
              <div style={{ color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>Sin envíos registrados</div>
              <div style={{ fontSize: 12 }}>Crea tu primer envío con el botón de arriba</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1a1e2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Folio', 'Destino', 'Paquetería / Guía', 'Fecha', 'Peso', 'Costo', 'Margen', 'Estatus', 'Acción', ''].map(h => (
                    <th key={h} style={{ padding: '9px 13px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(e => {
                  const est     = ESTATUS[e.estatus] || ESTATUS['pendiente']
                  const idx     = CICLO.indexOf(e.estatus)
                  const margen  = (e.valor_carga || 0) * 0.0125
                  const rent    = margen - (e.costo_envio || 0)
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 13px', fontFamily: 'Syne, sans-serif', fontSize: 11, color: '#818cf8', fontWeight: 600, whiteSpace: 'nowrap' }}>{e.folio}</td>
                      <td style={{ padding: '10px 13px' }}>
                        <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{e.destino_ciudad || '—'}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{e.destino_estado || ''}</div>
                      </td>
                      <td style={{ padding: '10px 13px' }}>
                        <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{e.paqueteria || '—'}</div>
                        {e.numero_guia && <div style={{ fontSize: 10, color: '#64748b', marginTop: 1, fontFamily: 'monospace' }}>{e.numero_guia}</div>}
                      </td>
                      <td style={{ padding: '10px 13px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtFecha(e.fecha_envio)}</td>
                      <td style={{ padding: '10px 13px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{e.peso_kg ? `${e.peso_kg} kg` : '—'}</td>
                      <td style={{ padding: '10px 13px', fontSize: 12, color: '#ef4444', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmt(e.costo_envio)}</td>
                      <td style={{ padding: '10px 13px', whiteSpace: 'nowrap' }}>
                        {e.valor_carga ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: rent >= 0 ? '#34d399' : '#ef4444' }}>{fmt(rent)}</div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{fmt(margen)} − {fmt(e.costo_envio)}</div>
                          </div>
                        ) : <span style={{ color: '#64748b', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 13px', whiteSpace: 'nowrap' }}>
                        <div style={{ marginBottom: 5 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: est.bg, color: est.color, fontSize: 11, fontWeight: 600 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: est.color }}/>
                            {est.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {CICLO.map((_, i) => (
                            <div key={i} style={{ height: 2, width: 12, borderRadius: 1, background: i <= idx ? est.color : 'rgba(255,255,255,0.08)' }}/>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 13px', whiteSpace: 'nowrap' }}>
                        {est.next && (
                          <button onClick={() => avanzarEstatus(e)} disabled={cambiando === e.id}
                            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {cambiando === e.id ? '...' : `→ ${est.nextLabel}`}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '10px 13px' }}>
                        <a href={`/paqueteria/${e.id}`}
                          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}>Ver</a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>Mostrando {filtrados.length} de {envios.length} envíos</div>
      </div>
    </div>
  )
}