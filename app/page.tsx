'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Ruta = {
  id: string; folio: string; nombre: string; estatus: string
  fecha_salida: string; origen: string; km_estimados: number
  costo_presupuesto: number; costo_real: number
  choferes?: { nombre_completo: string }
  unidades?: { placa: string }
  paradas?: { zona_temp: string }[]
}
type Envio = {
  id: string; folio: string; estatus: string; paqueteria: string
  destino_ciudad: string; costo_envio: number; valor_carga: number; fecha_envio: string
}
type Chofer = {
  id: string; nombre_completo: string; vencimiento_licencia: string; estatus: string
}

const ESTATUS_RUTA: Record<string, { label: string; color: string; bg: string }> = {
  en_creacion: { label: 'En creación', color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
  liberada:    { label: 'Liberada',    color: '#60a5fa', bg: 'rgba(96,165,250,.12)'  },
  embarcada:   { label: 'Embarcada',   color: '#a78bfa', bg: 'rgba(167,139,250,.12)' },
  en_transito: { label: 'En tránsito', color: '#fbbf24', bg: 'rgba(251,191,36,.12)'  },
  entregada:   { label: 'Entregada',   color: '#34d399', bg: 'rgba(52,211,153,.12)'  },
  cerrada:     { label: 'Cerrada',     color: '#64748b', bg: 'rgba(100,116,139,.12)' },
}
const ESTATUS_ENVIO: Record<string, { label: string; color: string }> = {
  pendiente:   { label: 'Pendiente',   color: '#94a3b8' },
  recolectado: { label: 'Recolectado', color: '#60a5fa' },
  en_transito: { label: 'En tránsito', color: '#fbbf24' },
  entregado:   { label: 'Entregado',   color: '#34d399' },
}

function fmt(n: number | null) {
  return n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}` : '—'
}
function hoy() { return new Date().toISOString().split('T')[0] }
function fmtFecha(f: string) {
  if (!f) return '—'
  return new Date(f.includes('T') ? f : f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
function diasParaVencer(fecha: string) {
  if (!fecha) return null
  return Math.ceil((new Date(fecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

export default function DashboardPage() {
  const [rutas,    setRutas]    = useState<Ruta[]>([])
  const [envios,   setEnvios]   = useState<Envio[]>([])
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [loading,  setLoading]  = useState(true)
  const [periodo,  setPeriodo]  = useState<'hoy' | 'semana' | 'libre'>('hoy')
  const [fechaLib, setFechaLib] = useState(hoy())

  useEffect(() => { fetchData() }, [periodo, fechaLib])

  async function fetchData() {
    setLoading(true)

    let desdeRutas = new Date()
    let hastaRutas = new Date()

    if (periodo === 'hoy') {
      desdeRutas.setHours(0, 0, 0, 0)
      hastaRutas.setHours(23, 59, 59, 999)
    } else if (periodo === 'semana') {
      desdeRutas.setDate(desdeRutas.getDate() - desdeRutas.getDay() + 1)
      desdeRutas.setHours(0, 0, 0, 0)
      hastaRutas.setHours(23, 59, 59, 999)
    } else {
      desdeRutas = new Date(fechaLib + 'T00:00:00')
      hastaRutas = new Date(fechaLib + 'T23:59:59')
    }

    const [{ data: r }, { data: e }, { data: c }] = await Promise.all([
      supabase.from('rutas')
        .select('*, choferes(nombre_completo), unidades(placa), paradas(zona_temp)')
        .gte('creado_en', desdeRutas.toISOString())
        .lte('creado_en', hastaRutas.toISOString())
        .order('creado_en', { ascending: false }),
      supabase.from('envios')
        .select('*')
        .gte('creado_en', desdeRutas.toISOString())
        .lte('creado_en', hastaRutas.toISOString())
        .order('creado_en', { ascending: false }),
      supabase.from('choferes').select('*').eq('activo', true),
    ])
    if (r) setRutas(r)
    if (e) setEnvios(e)
    if (c) setChoferes(c)
    setLoading(false)
  }

  const alertasLic = choferes.filter(c => {
    const d = diasParaVencer(c.vencimiento_licencia)
    return d !== null && d <= 30 && d >= 0
  })
  const rutasActivas    = rutas.filter(r => ['liberada','embarcada','en_transito'].includes(r.estatus))
  const rutasEntregadas = rutas.filter(r => ['entregada','cerrada'].includes(r.estatus))
  const presupuestoTotal = rutas.reduce((s, r) => s + (r.costo_presupuesto || 0), 0)
  const costoReal        = rutas.reduce((s, r) => s + (r.costo_real || 0), 0)
  const enviosActivos    = envios.filter(e => e.estatus !== 'entregado')
  const costoPaqueteria  = envios.reduce((s, e) => s + (e.costo_envio || 0), 0)
  const valorPaqueteria  = envios.reduce((s, e) => s + (e.valor_carga || 0), 0)
  const margenPaqueteria = valorPaqueteria * 0.0125
  const rentPaqueteria   = margenPaqueteria - costoPaqueteria

  const rankingChoferes = choferes
    .map(c => ({
      ...c,
      total:      rutas.filter(r => r.choferes?.nombre_completo === c.nombre_completo).length,
      entregadas: rutas.filter(r => r.choferes?.nombre_completo === c.nombre_completo && ['entregada','cerrada'].includes(r.estatus)).length,
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.entregadas - a.entregadas)
    .slice(0, 5)

  const periodoLabel = periodo === 'hoy' ? 'Hoy' : periodo === 'semana' ? 'Esta semana' : fmtFecha(fechaLib)

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Dashboard</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['hoy','semana','libre'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${periodo === p ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, background: periodo === p ? 'rgba(99,102,241,0.12)' : 'transparent', color: periodo === p ? '#818cf8' : '#64748b', fontSize: 12, fontWeight: periodo === p ? 600 : 400, cursor: 'pointer' }}>
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : 'Fecha'}
            </button>
          ))}
          {periodo === 'libre' && (
            <input type="date" value={fechaLib} onChange={e => setFechaLib(e.target.value)}
              style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none' }} />
          )}
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Alertas */}
        {alertasLic.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>⚠ {alertasLic.length} licencia{alertasLic.length > 1 ? 's' : ''} por vencer:</span>
            {alertasLic.map(c => (
              <span key={c.id} style={{ fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '2px 10px', borderRadius: 10 }}>
                {c.nombre_completo} — {diasParaVencer(c.vencimiento_licencia)} días
              </span>
            ))}
          </div>
        )}

        {/* KPIs principales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
          {[
            { label: 'Rutas totales',     value: rutas.length,           color: '#e2e8f0', sub: periodoLabel },
            { label: 'Rutas activas',     value: rutasActivas.length,    color: '#fbbf24', sub: 'En movimiento' },
            { label: 'Entregadas',        value: rutasEntregadas.length, color: '#34d399', sub: periodoLabel },
            { label: 'Envíos paquetería', value: envios.length,          color: '#818cf8', sub: `${enviosActivos.length} activos` },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* KPIs financieros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Presupuesto rutas', value: fmt(presupuestoTotal),  color: '#fbbf24', sub: 'Total del periodo' },
            { label: 'Costo real rutas',  value: fmt(costoReal || null), color: costoReal > presupuestoTotal ? '#ef4444' : '#34d399', sub: costoReal ? (costoReal > presupuestoTotal ? '⚠ Sobre presupuesto' : '✓ Dentro del presupuesto') : 'Sin costos registrados' },
            { label: 'Margen paquetería', value: fmt(margenPaqueteria),  color: '#818cf8', sub: 'Valor carga × 1.25%' },
            { label: 'Rent. paquetería',  value: fmt(rentPaqueteria),    color: rentPaqueteria >= 0 ? '#34d399' : '#ef4444', sub: 'Margen − costo envío' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>

          {/* Rutas del periodo */}
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>Rutas — {periodoLabel}</span>
              <a href="/rutas" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none' }}>Ver todas →</a>
            </div>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>Cargando...</div>
            ) : rutas.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⊞</div>
                No hay rutas para este periodo
              </div>
            ) : rutas.slice(0, 8).map(r => {
              const est = ESTATUS_RUTA[r.estatus] || ESTATUS_RUTA['en_creacion']
              return (
                <a key={r.id} href={`/rutas/${r.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{r.choferes?.nombre_completo || 'Sin chofer'} · {r.folio}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: est.bg, color: est.color, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: est.color }}/>
                    {est.label}
                  </span>
                </a>
              )
            })}
            {rutas.length > 8 && (
              <div style={{ padding: '10px 18px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                +{rutas.length - 8} rutas más
              </div>
            )}
          </div>

          {/* Ranking choferes */}
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>Ranking choferes</span>
              <a href="/choferes" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none' }}>Ver todos →</a>
            </div>
            {rankingChoferes.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>◎</div>
                Sin datos para este periodo
              </div>
            ) : rankingChoferes.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c54' : '#1a1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i < 3 ? '#0c0e14' : '#64748b', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{c.nombre_completo}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{c.total} ruta{c.total !== 1 ? 's' : ''} asignadas</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#34d399' }}>{c.entregadas}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>entregadas</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

          {/* Gráfica rentabilidad */}
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 16 }}>Presupuesto vs real — últimos 7 días</div>
            <RentabilidadChart />
          </div>

          {/* Paquetería activa */}
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>Paquetería activa</span>
              <a href="/paqueteria" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none' }}>Ver todos →</a>
            </div>
            {enviosActivos.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
                Sin envíos activos
              </div>
            ) : enviosActivos.slice(0, 6).map(e => {
              const est  = ESTATUS_ENVIO[e.estatus] || { label: e.estatus, color: '#64748b' }
              const rent = (e.valor_carga || 0) * 0.0125 - (e.costo_envio || 0)
              return (
                <a key={e.id} href={`/paqueteria/${e.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.folio}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{e.paqueteria} · {e.destino_ciudad || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: est.color }}>{est.label}</div>
                    <div style={{ fontSize: 10, color: rent >= 0 ? '#34d399' : '#ef4444', marginTop: 1 }}>{fmt(rent)}</div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Gráfica ────────────────────────────────────────────────────────────────
function RentabilidadChart() {
  const [datos, setDatos] = useState<{ dia: string; presupuesto: number; real: number }[]>([])

  useEffect(() => {
    async function fetchDatos() {
      const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split('T')[0]
      })
      const desde = new Date(dias[0] + 'T00:00:00').toISOString()
      const hasta  = new Date(dias[6] + 'T23:59:59').toISOString()
      const { data } = await supabase
        .from('rutas')
        .select('creado_en, costo_presupuesto, costo_real')
        .gte('creado_en', desde)
        .lte('creado_en', hasta)

      const agrupado = dias.map(dia => {
        const rutasDia = (data || []).filter(r => r.creado_en?.startsWith(dia))
        return {
          dia,
          presupuesto: rutasDia.reduce((s, r) => s + (r.costo_presupuesto || 0), 0),
          real:        rutasDia.reduce((s, r) => s + (r.costo_real || 0), 0),
        }
      })
      setDatos(agrupado)
    }
    fetchDatos()
  }, [])

  const maxVal = Math.max(...datos.map(d => Math.max(d.presupuesto, d.real)), 1)

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fbbf24' }}/>
          <span style={{ fontSize: 11, color: '#64748b' }}>Presupuesto</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6366f1' }}/>
          <span style={{ fontSize: 11, color: '#64748b' }}>Real</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 140 }}>
        {datos.map((d, i) => {
          const pctPres = maxVal > 0 ? (d.presupuesto / maxVal) * 100 : 0
          const pctReal = maxVal > 0 ? (d.real / maxVal) * 100 : 0
          const fecha   = new Date(d.dia + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 110 }}>
                <div style={{ flex: 1, background: '#fbbf24', borderRadius: '3px 3px 0 0', height: `${pctPres}%`, minHeight: d.presupuesto > 0 ? 3 : 0, opacity: 0.8, transition: 'height .4s' }}/>
                <div style={{ flex: 1, background: '#6366f1', borderRadius: '3px 3px 0 0', height: `${pctReal}%`, minHeight: d.real > 0 ? 3 : 0, transition: 'height .4s' }}/>
              </div>
              <div style={{ fontSize: 9, color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{fecha}</div>
            </div>
          )
        })}
      </div>
      {datos.every(d => d.presupuesto === 0 && d.real === 0) && (
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 8 }}>
          Sin datos de costo en los últimos 7 días
        </div>
      )}
    </div>
  )
}