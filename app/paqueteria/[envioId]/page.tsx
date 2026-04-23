'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Envio = {
  id: string; folio: string; estatus: string
  paqueteria: string; numero_guia: string
  fecha_envio: string; fecha_entrega_est: string; fecha_entrega_real: string
  origen: string; destino_ciudad: string; destino_estado: string
  peso_kg: number; costo_envio: number; valor_carga: number
  empaque_pasivo: boolean; tipo_empaque: string; notas: string
  creado_por: string; creado_en: string
}
type Destinatario = {
  id: string; productos: string; peso_kg: number; valor: number
  clientes?: { razon_social: string; ciudad: string; estado: string }
}
type Bitacora = {
  id: string; estatus_anterior: string; estatus_nuevo: string
  usuario: string; creado_en: string
}

const ESTATUS: Record<string, { label: string; color: string; bg: string; next?: string; nextLabel?: string }> = {
  pendiente:   { label: 'Pendiente',   color: '#94a3b8', bg: 'rgba(148,163,184,.12)', next: 'recolectado', nextLabel: 'Marcar recolectado' },
  recolectado: { label: 'Recolectado', color: '#60a5fa', bg: 'rgba(96,165,250,.12)',  next: 'en_transito', nextLabel: 'Poner en tránsito' },
  en_transito: { label: 'En tránsito', color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  next: 'entregado',   nextLabel: 'Marcar entregado' },
  entregado:   { label: 'Entregado',   color: '#34d399', bg: 'rgba(52,211,153,.12)' },
}
const CICLO = ['pendiente', 'recolectado', 'en_transito', 'entregado']

function fmt(n: number | null) {
  return n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'
}
function fmtFecha(f: string) {
  if (!f) return '—'
  return new Date(f.includes('T') ? f : f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DetalleEnvioPage() {
  const { envioId } = useParams()
  const router = useRouter()
  const [envio,     setEnvio]     = useState<Envio | null>(null)
  const [destinos,  setDestinos]  = useState<Destinatario[]>([])
  const [bitacora,  setBitacora]  = useState<Bitacora[]>([])
  const [loading,   setLoading]   = useState(true)
  const [cambiando, setCambiando] = useState(false)
  const [tab,       setTab]       = useState<'destinos' | 'financiero' | 'bitacora'>('destinos')

  useEffect(() => {
    if (envioId && envioId !== 'nuevo') fetchData()
    else setLoading(false)
  }, [envioId])

  async function fetchData() {
    setLoading(true)
    const [{ data: e }, { data: d }, { data: b }] = await Promise.all([
      supabase.from('envios').select('*').eq('id', envioId as string).single(),
      supabase.from('envio_destinatarios').select('*, clientes(razon_social, ciudad, estado)').eq('envio_id', envioId as string),
      supabase.from('bitacora_envios').select('*').eq('envio_id', envioId as string).order('creado_en', { ascending: false }),
    ])
    if (e) setEnvio(e)
    if (d) setDestinos(d)
    if (b) setBitacora(b)
    setLoading(false)
  }

  async function avanzarEstatus() {
    if (!envio) return
    const cfg = ESTATUS[envio.estatus]
    if (!cfg?.next) return
    setCambiando(true)
    const upd: Record<string, string> = { estatus: cfg.next }
    if (cfg.next === 'entregado') upd.fecha_entrega_real = new Date().toISOString().split('T')[0]
    await supabase.from('envios').update(upd).eq('id', envio.id)
    await supabase.from('bitacora_envios').insert({
      envio_id:         envio.id,
      estatus_anterior: envio.estatus,
      estatus_nuevo:    cfg.next,
      usuario:          process.env.NEXT_PUBLIC_USUARIO_NOMBRE || 'Sistema',
    })
    setEnvio(v => v ? { ...v, estatus: cfg.next!, ...upd } : v)
    await fetchData()
    setCambiando(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>Cargando...</div>
  if (!envio)  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>Envío no encontrado</div>

  const est          = ESTATUS[envio.estatus] || ESTATUS['pendiente']
  const idx          = CICLO.indexOf(envio.estatus)
  const margen       = (envio.valor_carga || 0) * 0.0125
  const rentabilidad = margen - (envio.costo_envio || 0)

  return (
    <div>
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push('/paqueteria')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>{envio.folio}</h1>
              <span style={{ fontSize: 12, color: '#64748b' }}>{envio.paqueteria}</span>
              {envio.numero_guia && <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{envio.numero_guia}</span>}
            </div>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {envio.destino_ciudad} · {fmtFecha(envio.fecha_envio)}
              {envio.empaque_pasivo && <span style={{ marginLeft: 8, color: '#60a5fa' }}>❄ Empaque pasivo</span>}
            </p>
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

        {/* Ciclo de vida */}
        <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {CICLO.map((s, i) => {
              const cfg    = ESTATUS[s]
              const activo = i === idx
              const pasado = i < idx
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                      background: activo ? cfg.color : pasado ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: `2px solid ${activo || pasado ? cfg.color : 'rgba(255,255,255,0.12)'}`,
                      color: activo ? '#0c0e14' : pasado ? cfg.color : '#64748b' }}>
                      {pasado ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: activo ? cfg.color : pasado ? '#94a3b8' : '#64748b', fontWeight: activo ? 600 : 400, textAlign: 'center' }}>
                      {cfg.label}
                    </span>
                  </div>
                  {i < CICLO.length - 1 && (
                    <div style={{ height: 2, flex: 0.4, background: i < idx ? est.color : 'rgba(255,255,255,0.08)', marginBottom: 20, flexShrink: 0 }}/>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Destinatarios', value: destinos.length,                          color: '#e2e8f0' },
            { label: 'Peso',          value: envio.peso_kg ? `${envio.peso_kg} kg` : '—', color: '#94a3b8' },
            { label: 'Costo envío',   value: fmt(envio.costo_envio),                   color: '#ef4444' },
            { label: 'Rentabilidad',  value: fmt(rentabilidad),                        color: rentabilidad >= 0 ? '#34d399' : '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18 }}>

          {/* IZQUIERDA — tabs */}
          <div>
            <div style={{ display: 'flex', gap: 2, background: '#1a1e2e', borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
              {([['destinos','Destinatarios'],['financiero','Financiero'],['bitacora','Bitácora']] as [typeof tab, string][]).map(([t, l]) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '6px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: tab === t ? '#131620' : 'transparent', color: tab === t ? '#e2e8f0' : '#64748b' }}>
                  {l}
                </button>
              ))}
            </div>

            {tab === 'destinos' && (
              <div>
                {destinos.length === 0 ? (
                  <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 32, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                    Sin destinatarios registrados
                  </div>
                ) : destinos.map((d, i) => (
                  <div key={d.id} style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{d.clientes?.razon_social || 'Cliente'}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{d.clientes?.ciudad}, {d.clientes?.estado}</div>
                        {d.productos && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>📦 {d.productos}</div>}
                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                          {d.peso_kg && <span style={{ fontSize: 11, color: '#64748b' }}>⚖ {d.peso_kg} kg</span>}
                          {d.valor   && <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>{fmt(d.valor)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'financiero' && (
              <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
                {[
                  ['Valor de la carga',    fmt(envio.valor_carga),  '#e2e8f0'],
                  ['Margen esperado (1.25%)', fmt(margen),           '#10b981'],
                  ['Costo paquetería',     fmt(envio.costo_envio),  '#ef4444'],
                  ['Rentabilidad neta',    fmt(rentabilidad),       rentabilidad >= 0 ? '#34d399' : '#ef4444'],
                ].map(([k, v, color]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{k}</span>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'bitacora' && (
              <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  Historial de movimientos
                </div>
                {bitacora.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 12 }}>Sin movimientos registrados</div>
                ) : bitacora.map((b, i) => {
                  const cfgA = ESTATUS[b.estatus_anterior] || {}
                  const cfgN = ESTATUS[b.estatus_nuevo]    || {}
                  return (
                    <div key={b.id} style={{ display: 'flex', gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfgN.color || '#64748b', marginTop: 3 }}/>
                        {i < bitacora.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', minHeight: 20 }}/>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: cfgA.bg || 'rgba(255,255,255,0.05)', color: cfgA.color || '#64748b' }}>{cfgA.label || b.estatus_anterior}</span>
                          <span style={{ fontSize: 10, color: '#64748b' }}>→</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: cfgN.bg || 'rgba(255,255,255,0.05)', color: cfgN.color || '#64748b' }}>{cfgN.label || b.estatus_nuevo}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>
                          {b.usuario && <span style={{ marginRight: 8, color: '#94a3b8' }}>{b.usuario}</span>}
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
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Detalle</div>
            {[
              ['Paquetería',    envio.paqueteria        || '—'],
              ['Guía',         envio.numero_guia        || '—'],
              ['Origen',       envio.origen             || '—'],
              ['Destino',      envio.destino_ciudad     || '—'],
              ['Fecha envío',  fmtFecha(envio.fecha_envio)],
              ['Entrega est.', fmtFecha(envio.fecha_entrega_est)],
              ['Entrega real', fmtFecha(envio.fecha_entrega_real)],
              ['Empaque',      envio.empaque_pasivo ? '❄ Pasivo' : 'Sin empaque'],
              ['Creado por',   envio.creado_por         || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ fontWeight: 500, color: '#e2e8f0', textAlign: 'right', maxWidth: 150 }}>{v}</span>
              </div>
            ))}
            {envio.notas && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#1a1e2e', borderRadius: 8, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{envio.notas}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}