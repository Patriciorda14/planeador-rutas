'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Unidad = {
  id: string; placa: string; tipo: string
  capacidad_kg: number; capacidad_tarimas: number
  zonas_temp: string[]; activo: boolean
}
type Ruta = {
  id: string; folio: string; nombre: string; estatus: string
  fecha_salida: string; km_estimados: number
}

const ZONAS: Record<string, { label: string; color: string; icon: string }> = {
  congelado:   { label: 'Congelado',   color: '#60a5fa', icon: '❄' },
  refrigerado: { label: 'Refrigerado', color: '#34d399', icon: '🌡' },
  ambiente:    { label: 'Ambiente',    color: '#fbbf24', icon: '☀' },
}
const ESTATUS_RUTA: Record<string, { label: string; color: string }> = {
  en_creacion: { label: 'En creación', color: '#94a3b8' },
  liberada:    { label: 'Liberada',    color: '#60a5fa' },
  embarcada:   { label: 'Embarcada',   color: '#a78bfa' },
  en_transito: { label: 'En tránsito', color: '#fbbf24' },
  entregada:   { label: 'Entregada',   color: '#34d399' },
  cerrada:     { label: 'Cerrada',     color: '#64748b' },
}

export default function DetalleUnidadPage() {
  const { unidadId } = useParams()
  const router = useRouter()
  const [unidad,  setUnidad]  = useState<Unidad | null>(null)
  const [rutas,   setRutas]   = useState<Ruta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (unidadId) fetchData() }, [unidadId])

  async function fetchData() {
    setLoading(true)
    const [{ data: u }, { data: r }] = await Promise.all([
      supabase.from('unidades').select('*').eq('id', unidadId as string).single(),
      supabase.from('rutas')
        .select('id, folio, nombre, estatus, fecha_salida, km_estimados')
        .eq('unidad_id', unidadId as string)
        .order('fecha_salida', { ascending: false }),
    ])
    if (u) setUnidad(u)
    if (r) setRutas(r)
    setLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>Cargando...</div>
  if (!unidad) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>Unidad no encontrada</div>

  const kmTotales = rutas.reduce((s, r) => s + (r.km_estimados || 0), 0)
  const m3Equiv   = unidad.capacidad_tarimas ? (unidad.capacidad_tarimas * 1.92).toFixed(1) : '—'

  return (
    <div>
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push('/unidades')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>←</button>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>{unidad.placa}</h1>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{unidad.tipo} · {rutas.length} rutas asignadas</p>
          </div>
        </div>
        <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: unidad.activo ? 'rgba(52,211,153,.12)' : 'rgba(100,116,139,.12)', color: unidad.activo ? '#34d399' : '#64748b', fontWeight: 600 }}>
          {unidad.activo ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18 }}>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Especificaciones</div>
              {[
                ['Placa',      unidad.placa],
                ['Tipo',       unidad.tipo],
                ['Cap. kg',    unidad.capacidad_kg ? `${unidad.capacidad_kg.toLocaleString('es-MX')} kg` : '—'],
                ['Tarimas',    unidad.capacidad_tarimas ? `${unidad.capacidad_tarimas} tarimas` : '—'],
                ['M³ equiv.',  `${m3Equiv} m³`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Zonas de temperatura</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {(unidad.zonas_temp || []).map(z => (
                    <span key={z} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: ZONAS[z]?.color || '#94a3b8' }}>
                      {ZONAS[z]?.icon} {ZONAS[z]?.label || z}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total rutas',  value: rutas.length,                                                                        color: '#e2e8f0' },
                { label: 'Km totales',   value: kmTotales.toLocaleString('es-MX'),                                                  color: '#818cf8' },
                { label: 'Completadas',  value: rutas.filter(r => r.estatus === 'entregada' || r.estatus === 'cerrada').length,      color: '#34d399' },
                { label: 'En tránsito',  value: rutas.filter(r => r.estatus === 'en_transito' || r.estatus === 'embarcada').length,  color: '#fbbf24' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial */}
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderR