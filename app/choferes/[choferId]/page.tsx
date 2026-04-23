'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Chofer = {
  id: string; nombre_completo: string; tipo_licencia: string
  vencimiento_licencia: string; telefono: string; estatus: string; activo: boolean
}
type Ruta = {
  id: string; folio: string; nombre: string; estatus: string
  fecha_salida: string; origen: string; km_estimados: number
}

const ESTATUS_CHOFER: Record<string, { label: string; color: string; bg: string }> = {
  disponible: { label: 'Disponible', color: '#34d399', bg: 'rgba(52,211,153,.12)' },
  en_ruta:    { label: 'En ruta',    color: '#fbbf24', bg: 'rgba(251,191,36,.12)' },
  descanso:   { label: 'Descanso',   color: '#60a5fa', bg: 'rgba(96,165,250,.12)' },
  inactivo:   { label: 'Inactivo',   color: '#64748b', bg: 'rgba(100,116,139,.12)' },
}

const ESTATUS_RUTA: Record<string, { label: string; color: string }> = {
  en_creacion: { label: 'En creación', color: '#94a3b8' },
  liberada:    { label: 'Liberada',    color: '#60a5fa' },
  embarcada:   { label: 'Embarcada',   color: '#a78bfa' },
  en_transito: { label: 'En tránsito', color: '#fbbf24' },
  entregada:   { label: 'Entregada',   color: '#34d399' },
  cerrada:     { label: 'Cerrada',     color: '#64748b' },
}

function diasParaVencer(fecha: string) {
  if (!fecha) return null
  return Math.ceil((new Date(fecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

function fmtFecha(f: string) {
  if (!f) return '—'
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DetalleChoferPage() {
  const { choferId } = useParams()
  const router = useRouter()
  const [chofer,  setChofer]  = useState<Chofer | null>(null)
  const [rutas,   setRutas]   = useState<Ruta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (choferId) fetchData() }, [choferId])

  async function fetchData() {
    setLoading(true)
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from('choferes').select('*').eq('id', choferId as string).single(),
      supabase.from('rutas').select('id, folio, nombre, estatus, fecha_salida, origen, km_estimados')
        .eq('chofer_id', choferId as string).order('fecha_salida', { ascending: false }),
    ])
    if (c) setChofer(c)
    if (r) setRutas(r)
    setLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>Cargando...</div>
  if (!chofer) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>Chofer no encontrado</div>

  const est  = ESTATUS_CHOFER[chofer.estatus] || ESTATUS_CHOFER['disponible']
  const dias = diasParaVencer(chofer.vencimiento_licencia)
  const venceProximo = dias !== null && dias <= 30 && dias >= 0
  const vencido      = dias !== null && dias < 0

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push('/choferes')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {chofer.nombre_completo[0]}
            </div>
            <div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>{chofer.nombre_completo}</h1>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Licencia tipo {chofer.tipo_licencia} · {rutas.length} rutas asignadas</p>
            </div>
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, background: est.bg, color: est.color, fontSize: 12, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: est.color }}/>
          {est.label}
        </span>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Alerta vencimiento */}
        {(venceProximo || vencido) && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>
              {vencido ? `Licencia vencida hace ${Math.abs(dias!)} días` : `Licencia vence en ${dias} días — ${fmtFecha(chofer.vencimiento_licencia)}`}
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18 }}>

          {/* Info del chofer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Información</div>
              {[
                ['Nombre',      chofer.nombre_completo],
                ['Licencia',    `Tipo ${chofer.tipo_licencia}`],
                ['Vencimiento', fmtFecha(chofer.vencimiento_licencia)],
                ['Teléfono',    chofer.telefono || '—'],
                ['Estatus',     est.label],
                ['Estado',      chofer.activo ? 'Activo' : 'Inactivo'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total rutas', value: rutas.length, color: '#e2e8f0' },
                { label: 'Completadas', value: rutas.filter(r => r.estatus === 'entregada' || r.estatus === 'cerrada').length, color: '#34d399' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial de rutas */}
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Historial de rutas ({rutas.length})
            </div>
            {rutas.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 32, fontSize: 12 }}>Este chofer no tiene rutas asignadas aún</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Folio', 'Ruta', 'Fecha', 'Km', 'Estatus'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rutas.map(r => {
                    const er = ESTATUS_RUTA[r.estatus] || { label: r.estatus, color: '#64748b' }
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                        onClick={() => router.push(`/rutas/${r.id}`)}>
                        <td style={{ padding: '10px 12px', fontFamily: 'Syne, sans-serif', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{r.folio}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{r.nombre}</div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{r.origen}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {r.fecha_salida ? new Date(r.fecha_salida).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>
                          {r.km_estimados ? `${r.km_estimados} km` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: er.color }}>{er.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}