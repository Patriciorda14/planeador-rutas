'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Cliente = {
  id: string; razon_social: string; direccion: string
  ciudad: string; estado: string; contacto: string
  telefono: string; horario_entrega: string; activo: boolean
}
type Ruta = {
  id: string; folio: string; nombre: string; estatus: string
  fecha_salida: string; km_estimados: number; costo_presupuesto: number
}

const ESTATUS_RUTA: Record<string, { label: string; color: string }> = {
  en_creacion: { label: 'En creación', color: '#94a3b8' },
  liberada:    { label: 'Liberada',    color: '#60a5fa' },
  embarcada:   { label: 'Embarcada',   color: '#a78bfa' },
  en_transito: { label: 'En tránsito', color: '#fbbf24' },
  entregada:   { label: 'Entregada',   color: '#34d399' },
  cerrada:     { label: 'Cerrada',     color: '#64748b' },
}

function fmt(n: number | null) {
  return n != null ? `$${Number(n).toLocaleString('es-MX')}` : '—'
}

export default function DetalleClientePage() {
const { cId: clienteId } = useParams()
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [rutas,   setRutas]   = useState<Ruta[]>([])
  const [loading, setLoading] = useState(true)

useEffect(() => {
  if (clienteId && clienteId !== 'nuevo') fetchData()
  else if (clienteId === 'nuevo') setLoading(false)
}, [clienteId])

  async function fetchData() {
    setLoading(true)
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', clienteId as string).single(),
      supabase.from('paradas')
        .select('rutas(id, folio, nombre, estatus, fecha_salida, km_estimados, costo_presupuesto)')
        .eq('cliente_id', clienteId as string),
    ])
    if (c) setCliente(c)
    if (p) {
      const rutasUnicas = Array.from(
        new Map(p.map((x: any) => [x.rutas?.id, x.rutas]).filter(([k]) => k)).values()
      ) as Ruta[]
      setRutas(rutasUnicas.sort((a, b) => new Date(b.fecha_salida).getTime() - new Date(a.fecha_salida).getTime()))
    }
    setLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>Cargando...</div>
  if (!cliente) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>Cliente no encontrado</div>

  const entregadas = rutas.filter(r => r.estatus === 'entregada' || r.estatus === 'cerrada').length

  return (
    <div>
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push('/clientes')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>←</button>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>{cliente.razon_social}</h1>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{cliente.ciudad}{cliente.estado ? `, ${cliente.estado}` : ''} · {rutas.length} entregas</p>
          </div>
        </div>
        <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: cliente.activo ? 'rgba(52,211,153,.12)' : 'rgba(100,116,139,.12)', color: cliente.activo ? '#34d399' : '#64748b', fontWeight: 600 }}>
          {cliente.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18 }}>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Información</div>
              {[
                ['Razón social',  cliente.razon_social],
                ['Dirección',     cliente.direccion    || '—'],
                ['Ciudad',        cliente.ciudad       || '—'],
                ['Estado',        cliente.estado       || '—'],
                ['Contacto',      cliente.contacto     || '—'],
                ['Teléfono',      cliente.telefono     || '—'],
                ['Horario',       cliente.horario_entrega || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ fontWeight: 500, color: '#e2e8f0', textAlign: 'right', maxWidth: 160 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total rutas',   value: rutas.length,   color: '#e2e8f0' },
                { label: 'Entregadas',    value: entregadas,     color: '#34d399' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial de entregas */}
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Historial de entregas ({rutas.length})
            </div>
            {rutas.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 32, fontSize: 12 }}>Este cliente no tiene entregas registradas aún</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Folio', 'Ruta', 'Fecha', 'Km', 'Presupuesto', 'Estatus'].map(h => (
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
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{r.nombre}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {r.fecha_salida ? new Date(r.fecha_salida).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>{r.km_estimados ? `${r.km_estimados} km` : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{fmt(r.costo_presupuesto)}</td>
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