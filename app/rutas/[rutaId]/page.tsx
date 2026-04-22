'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ESTATUS: Record<string, { label: string; color: string; bg: string; next?: string; nextLabel?: string }> = {
  en_creacion: { label: 'En creación', color: '#94a3b8', bg: 'rgba(148,163,184,.12)', next: 'liberada',    nextLabel: 'Liberar ruta' },
  liberada:    { label: 'Liberada',    color: '#60a5fa', bg: 'rgba(96,165,250,.12)',  next: 'embarcada',   nextLabel: 'Marcar embarcada' },
  embarcada:   { label: 'Embarcada',   color: '#a78bfa', bg: 'rgba(167,139,250,.12)', next: 'en_transito', nextLabel: 'Poner en tránsito' },
  en_transito: { label: 'En tránsito', color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  next: 'entregada',   nextLabel: 'Marcar entregada' },
  entregada:   { label: 'Entregada',   color: '#34d399', bg: 'rgba(52,211,153,.12)',  next: 'cerrada',     nextLabel: 'Cerrar ruta' },
  cerrada:     { label: 'Cerrada',     color: '#64748b', bg: 'rgba(100,116,139,.12)' },
}

const CICLO = ['en_creacion','liberada','embarcada','en_transito','entregada','cerrada']

const ZONAS: Record<string, { label: string; color: string; icon: string }> = {
  congelado:   { label: 'Congelado',   color: '#60a5fa', icon: '❄' },
  refrigerado: { label: 'Refrigerado', color: '#34d399', icon: '🌡' },
  ambiente:    { label: 'Ambiente',    color: '#fbbf24', icon: '☀' },
}

function fmt(n: number | null) {
  return n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'
}
function fmtFecha(f: string) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type Ruta = {
  id: string; folio: string; nombre: string; estatus: string
  fecha_salida: string; origen: string; km_estimados: number
  costo_presupuesto: number; costo_real: number; notas: string
  choferes?: { nombre_completo: string; tipo_licencia: string }
  unidades?:  { placa: string; tipo: string; capacidad_kg: number }
  paradas?: {
    id: string; orden: number; zona_temp: string; peso_kg: number
    hora_estimada: string; notas: string
    clientes?: { razon_social: string; ciudad: string; estado: string }
    cargas?:   { producto: string; sku: string; cantidad: number }[]
  }[]
  bitacora_rutas?: {
    accion: string; estatus_anterior: string; estatus_nuevo: string; creado_en: string
  }[]
}

export default function DetalleRutaPage() {
const { rutaId: id } = useParams()
  const router  = useRouter()
  const [ruta,      setRuta]      = useState<Ruta | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [cambiando, setCambiando] = useState(false)
  const [tab,       setTab]       = useState<'paradas' | 'financiero' | 'bitacora'>('paradas')

 useEffect(() => { 
  if (id && id !== 'nueva') fetchRuta() 
  else if (id === 'nueva') setLoading(false)
}, [id])

  async function fetchRuta() {
  if (!id || id === 'nueva') return
    setLoading(true)
    const { data, error } = await supabase
      .from('rutas')
      .select(`
        *,
        choferes(nombre_completo, tipo_licencia),
        unidades(placa, tipo, capacidad_kg),
        paradas(*, clientes(razon_social, ciudad, estado), cargas(*)),
        bitacora_rutas(*)
      `)
      .eq('id', id as string)
      .single()
    if (data) setRuta(data)
    if (error) console.error(error)
    setLoading(false)
  }

  async function avanzarEstatus() {
    if (!ruta) return
    const cfg = ESTATUS[ruta.estatus]
    if (!cfg?.next) return
    setCambiando(true)
    await supabase.from('rutas').update({ estatus: cfg.next }).eq('id', ruta.id)
    setRuta(r => r ? { ...r, estatus: cfg.next! } : r)
    setCambiando(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
        <div>Cargando ruta...</div>
      </div>
    </div>
  )

  if (!ruta) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
      <div style={{ color: '#94a3b8', fontWeight: 500, marginBottom: 16 }}>Ruta no encontrada</div>
      <button onClick={() => router.push('/rutas')} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>← Volver a rutas</button>
    </div>
  )

  const est  = ESTATUS[ruta.estatus] || ESTATUS['en_creacion']
  const idx  = CICLO.indexOf(ruta.estatus)
  const paradasOrdenadas = [...(ruta.paradas || [])].sort((a, b) => a.orden - b.orden)
  const totalKg = paradasOrdenadas.reduce((s, p) => s + (p.peso_kg || 0), 0)

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push('/rutas')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>←</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>{ruta.nombre}</h1>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{ruta.folio}</span>
            </div>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{fmtFecha(ruta.fecha_salida)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: est.bg, color: est.color, fontSize: 12, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: est.color }}/>
            {est.label}
          </span>
          {est.next && (
            <button onClick={avanzarEstatus} disabled={cambiando}
              style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {cambiando ? 'Actualizando...' : `→ ${est.nextLabel}`}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Ciclo de vida visual */}
        <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {CICLO.map((s, i) => {
              const cfg    = ESTATUS[s]
              const activo = i === idx
              const pasado = i < idx
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: activo ? cfg.color : pasado ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: `2px solid ${activo || pasado ? cfg.color : 'rgba(255,255,255,0.12)'}`,
                      color: activo ? '#0c0e14' : pasado ? cfg.color : '#64748b',
                    }}>
                      {pasado ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: activo ? cfg.color : pasado ? '#94a3b8' : '#64748b', fontWeight: activo ? 600 : 400, textAlign: 'center', lineHeight: 1.3 }}>
                      {cfg.label}
                    </span>
                  </div>
                  {i < CICLO.length - 1 && (
                    <div style={{ height: 2, flex: 0.4, background: i < idx ? est.color : 'rgba(255,255,255,0.08)', marginBottom: 22, flexShrink: 0 }}/>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Paradas',      value: paradasOrdenadas.length,                    color: '#e2e8f0' },
            { label: 'Km estimados', value: ruta.km_estimados ? `${ruta.km_estimados} km` : '—', color: '#94a3b8' },
            { label: 'Presupuesto',  value: fmt(ruta.costo_presupuesto),                color: '#fbbf24' },
            { label: 'Carga total',  value: `${totalKg.toLocaleString('es-MX')} kg`,    color: '#60a5fa' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18 }}>

          {/* IZQUIERDA */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, background: '#1a1e2e', borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
              {([['paradas','Paradas'],['financiero','Financiero'],['bitacora','Bitácora']] as [typeof tab, string][]).map(([t, l]) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '6px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: tab === t ? '#131620' : 'transparent',
                    color: tab === t ? '#e2e8f0' : '#64748b' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Tab: Paradas */}
            {tab === 'paradas' && (
              <div>
                {paradasOrdenadas.length === 0 ? (
                  <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 32, textAlign: 'center', color: '#64748b' }}>
                    Sin paradas registradas
                  </div>
                ) : paradasOrdenadas.map((p, i) => {
                  const zc = ZONAS[p.zona_temp] || {}
                  return (
                    <div key={p.id} style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{p.clientes?.razon_social || 'Cliente'}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{p.clientes?.ciudad}, {p.clientes?.estado}</div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: zc.color }}>{zc.icon} {zc.label}</span>
                            {p.peso_kg > 0 && <span style={{ fontSize: 11, color: '#64748b' }}>⚖ {p.peso_kg.toLocaleString('es-MX')} kg</span>}
                          </div>
                        </div>
                      </div>
                      {p.cargas && p.cargas.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 16px 12px 56px' }}>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Productos</div>
                          {p.cargas.map((c, j) => (
                            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', padding: '2px 0' }}>
                              <span>{c.producto} {c.sku ? `(${c.sku})` : ''}</span>
                              <span style={{ color: '#64748b' }}>× {c.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tab: Financiero */}
            {tab === 'financiero' && (
              <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div style={{ background: '#1a1e2e', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Presupuesto</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>{fmt(ruta.costo_presupuesto)}</div>
                  </div>
                  <div style={{ background: '#1a1e2e', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Costo real</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: ruta.costo_real > ruta.costo_presupuesto ? '#ef4444' : '#34d399' }}>{fmt(ruta.costo_real)}</div>
                  </div>
                </div>
                {!ruta.costo_real && (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, padding: '12px 0' }}>El costo real se registra al cerrar la ruta</div>
                )}
              </div>
            )}

            {/* Tab: Bitácora */}
            {tab === 'bitacora' && (
              <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
                {!ruta.bitacora_rutas?.length ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 12 }}>Sin movimientos registrados aún</div>
                ) : [...(ruta.bitacora_rutas || [])].sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()).map((b, i) => {
                  const cfgN = ESTATUS[b.estatus_nuevo] || {}
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfgN.color || '#64748b', flexShrink: 0, marginTop: 5 }}/>
                      <div>
                        <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>
                          Cambió a <span style={{ color: cfgN.color }}>{cfgN.label || b.estatus_nuevo}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {new Date(b.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* DERECHA — info */}
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, alignSelf: 'start' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Información</div>
            {[
              ['Chofer',   ruta.choferes?.nombre_completo || 'Sin asignar'],
              ['Licencia', ruta.choferes?.tipo_licencia   || '—'],
              ['Unidad',   ruta.unidades?.placa           || 'Sin asignar'],
              ['Tipo',     ruta.unidades?.tipo            || '—'],
              ['Origen',   ruta.origen                    || '—'],
              ['Km est.',  ruta.km_estimados ? `${ruta.km_estimados} km` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ fontWeight: 500, color: '#e2e8f0', textAlign: 'right', maxWidth: 160 }}>{v}</span>
              </div>
            ))}
            {ruta.notas && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#1a1e2e', borderRadius: 8, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{ruta.notas}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}