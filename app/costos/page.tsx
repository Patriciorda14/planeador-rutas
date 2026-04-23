'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type CostoRuta = {
  id: string
  ruta_id: string
  concepto: string
  tipo: string
  monto: number
  es_presupuesto: boolean
  creado_en: string
  rutas?: {
    folio: string
    nombre: string
    estatus: string
    fecha_salida: string
    costo_presupuesto: number
    costo_real: number
  }
}

type ResumenRuta = {
  id: string
  folio: string
  nombre: string
  estatus: string
  fecha_salida: string
  costo_presupuesto: number
  costo_real: number
}

const TIPOS: Record<string, { label: string; color: string; icon: string }> = {
  combustible:   { label: 'Combustible',   color: '#f59e0b', icon: '⛽' },
  caseta:        { label: 'Casetas',        color: '#60a5fa', icon: '🛣' },
  chofer:        { label: 'Chofer',         color: '#34d399', icon: '👤' },
  mantenimiento: { label: 'Mantenimiento',  color: '#a78bfa', icon: '🔧' },
  otro:          { label: 'Otro',           color: '#94a3b8', icon: '◎'  },
}

const ESTATUS_RUTA: Record<string, { label: string; color: string }> = {
  en_creacion: { label: 'En creación', color: '#94a3b8' },
  liberada:    { label: 'Liberada',    color: '#60a5fa' },
  embarcada:   { label: 'Embarcada',   color: '#a78bfa' },
  en_transito: { label: 'En tránsito', color: '#fbbf24' },
  entregada:   { label: 'Entregada',   color: '#34d399' },
  cerrada:     { label: 'Cerrada',     color: '#64748b' },
}

const INPUT: React.CSSProperties = {
  background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', width: '100%',
}
const LBL: React.CSSProperties = {
  fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em',
}

function fmt(n: number | null) {
  return n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'
}
function fmtFecha(f: string) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CostosPage() {
  const [rutas,      setRutas]      = useState<ResumenRuta[]>([])
  const [costos,     setCostos]     = useState<CostoRuta[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [guardando,  setGuardando]  = useState(false)
  const [search,     setSearch]     = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [tab,        setTab]        = useState<'resumen' | 'detalle'>('resumen')

  const [form, setForm] = useState({
    ruta_id: '', concepto: '', tipo: 'combustible',
    monto: '', es_presupuesto: false,
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('rutas')
        .select('id, folio, nombre, estatus, fecha_salida, costo_presupuesto, costo_real')
        .order('fecha_salida', { ascending: false }),
      supabase.from('costos_ruta')
        .select('*, rutas(folio, nombre, estatus, fecha_salida, costo_presupuesto, costo_real)')
        .order('creado_en', { ascending: false }),
    ])
    if (r) setRutas(r)
    if (c) setCostos(c)
    setLoading(false)
  }

  async function guardar() {
    if (!form.ruta_id || !form.monto) return
    setGuardando(true)
    await supabase.from('costos_ruta').insert({
      ruta_id:        form.ruta_id,
      concepto:       form.concepto || TIPOS[form.tipo]?.label,
      tipo:           form.tipo,
      monto:          Number(form.monto),
      es_presupuesto: form.es_presupuesto,
    })

    // Actualizar costo_real en la ruta sumando todos los costos reales
    const { data: costosDeLaRuta } = await supabase
      .from('costos_ruta')
      .select('monto')
      .eq('ruta_id', form.ruta_id)
      .eq('es_presupuesto', false)

    if (costosDeLaRuta) {
      const total = costosDeLaRuta.reduce((s, c) => s + Number(c.monto), 0) + (form.es_presupuesto ? 0 : Number(form.monto))
      await supabase.from('rutas').update({ costo_real: total }).eq('id', form.ruta_id)
    }

    await fetchData()
    setShowModal(false)
    setGuardando(false)
    setForm({ ruta_id: '', concepto: '', tipo: 'combustible', monto: '', es_presupuesto: false })
  }

  const costosFiltrados = costos.filter(c => {
    const ms = !search || (c.rutas?.nombre || '').toLowerCase().includes(search.toLowerCase()) || (c.rutas?.folio || '').toLowerCase().includes(search.toLowerCase())
    const mt = filtroTipo === 'todos' || c.tipo === filtroTipo
    return ms && mt
  })

  // Stats globales
  const totalPresupuestado = rutas.reduce((s, r) => s + (r.costo_presupuesto || 0), 0)
  const totalReal          = rutas.reduce((s, r) => s + (r.costo_real || 0), 0)
  const rutasConDesvio     = rutas.filter(r => r.costo_real && r.costo_real > r.costo_presupuesto).length
  const ahorro             = totalPresupuestado - totalReal

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Costos</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Control de costos por ruta</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + Registrar costo
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total presupuestado', value: fmt(totalPresupuestado),  color: '#fbbf24' },
            { label: 'Total real',          value: fmt(totalReal),           color: totalReal > totalPresupuestado ? '#ef4444' : '#34d399' },
            { label: 'Diferencia',          value: fmt(Math.abs(ahorro)),    color: ahorro >= 0 ? '#34d399' : '#ef4444', sub: ahorro >= 0 ? 'Ahorro' : 'Sobrecosto' },
            { label: 'Rutas con desvío',    value: rutasConDesvio,           color: rutasConDesvio > 0 ? '#ef4444' : '#34d399' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', flex: 1 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: '#1a1e2e', borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
          {([['resumen', 'Resumen por ruta'], ['detalle', 'Detalle de costos']] as [typeof tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '6px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: tab === t ? '#131620' : 'transparent', color: tab === t ? '#e2e8f0' : '#64748b' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Tab: Resumen por ruta */}
        {tab === 'resumen' && (
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1a1e2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Ruta', 'Fecha', 'Estatus', 'Presupuesto', 'Real', 'Diferencia', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rutas.map(r => {
                    const er   = ESTATUS_RUTA[r.estatus] || { label: r.estatus, color: '#64748b' }
                    const diff = r.costo_real && r.costo_presupuesto ? r.costo_real - r.costo_presupuesto : null
                    const pct  = diff && r.costo_presupuesto ? (diff / r.costo_presupuesto) * 100 : null
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{r.folio}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginTop: 1 }}>{r.nombre}</div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtFecha(r.fecha_salida)}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: er.color }}>{er.label}</span>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: '#fbbf24', fontWeight: 500 }}>{fmt(r.costo_presupuesto)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 500, color: r.costo_real ? (r.costo_real > r.costo_presupuesto ? '#ef4444' : '#34d399') : '#64748b' }}>
                          {fmt(r.costo_real)}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {diff !== null ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: diff > 0 ? '#ef4444' : '#34d399' }}>
                                {diff > 0 ? '+' : ''}{fmt(diff)}
                              </div>
                              {pct !== null && <div style={{ fontSize: 10, color: diff > 0 ? '#ef4444' : '#34d399' }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</div>}
                            </div>
                          ) : <span style={{ color: '#64748b', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {!r.costo_real ? (
                            <span style={{ fontSize: 11, color: '#64748b' }}>Sin costos</span>
                          ) : diff !== null && diff > 0 ? (
                            <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>⚠ Desvío</span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>✓ OK</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab: Detalle */}
        {tab === 'detalle' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input placeholder="Buscar por ruta o folio..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...INPUT, width: 'auto', flex: 1, maxWidth: 300 }} />
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...INPUT, width: 180 }}>
                <option value="todos">Todos los tipos</option>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
              {costosFiltrados.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>$</div>
                  <div style={{ color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>Sin costos registrados</div>
                  <div style={{ fontSize: 12 }}>Registra el primer costo con el botón de arriba</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1a1e2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Ruta', 'Concepto', 'Tipo', 'Monto', 'Tipo registro', 'Fecha'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {costosFiltrados.map(c => {
                      const tipo = TIPOS[c.tipo] || TIPOS['otro']
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{c.rutas?.folio}</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 1 }}>{c.rutas?.nombre}</div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>{c.concepto}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: tipo.color }}>
                              {tipo.icon} {tipo.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{fmt(c.monto)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: c.es_presupuesto ? 'rgba(251,191,36,.1)' : 'rgba(52,211,153,.1)', color: c.es_presupuesto ? '#fbbf24' : '#34d399' }}>
                              {c.es_presupuesto ? 'Presupuesto' : 'Real'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtFecha(c.creado_en)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal registrar costo */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: 460, maxWidth: '90vw' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 20 }}>
              Registrar costo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={LBL}>Ruta *</label>
                <select style={INPUT} value={form.ruta_id} onChange={e => setForm(f => ({ ...f, ruta_id: e.target.value }))}>
                  <option value="">— Selecciona ruta —</option>
                  {rutas.map(r => <option key={r.id} value={r.id}>{r.folio} · {r.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Tipo</label>
                  <select style={INPUT} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Monto (MXN) *</label>
                  <input style={INPUT} type="number" placeholder="0.00" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={LBL}>Concepto (opcional)</label>
                <input style={INPUT} placeholder="Descripción del gasto" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setForm(f => ({ ...f, es_presupuesto: false }))}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${!form.es_presupuesto ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.1)'}`, background: !form.es_presupuesto ? 'rgba(52,211,153,0.08)' : 'transparent', color: !form.es_presupuesto ? '#34d399' : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: !form.es_presupuesto ? 600 : 400 }}>
                  ✓ Costo real
                </button>
                <button onClick={() => setForm(f => ({ ...f, es_presupuesto: true }))}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${form.es_presupuesto ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`, background: form.es_presupuesto ? 'rgba(251,191,36,0.08)' : 'transparent', color: form.es_presupuesto ? '#fbbf24' : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: form.es_presupuesto ? 600 : 400 }}>
                  Presupuesto
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={guardar} disabled={!form.ruta_id || !form.monto || guardando}
                style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : 'Registrar costo'}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ background: '#1a1e2e', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}