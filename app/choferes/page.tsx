'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Chofer = {
  id: string
  nombre_completo: string
  tipo_licencia: string
  vencimiento_licencia: string
  telefono: string
  estatus: string
  activo: boolean
  creado_en: string
}

const ESTATUS: Record<string, { label: string; color: string; bg: string }> = {
  disponible: { label: 'Disponible', color: '#34d399', bg: 'rgba(52,211,153,.12)' },
  en_ruta:    { label: 'En ruta',    color: '#fbbf24', bg: 'rgba(251,191,36,.12)' },
  descanso:   { label: 'Descanso',   color: '#60a5fa', bg: 'rgba(96,165,250,.12)' },
  inactivo:   { label: 'Inactivo',   color: '#64748b', bg: 'rgba(100,116,139,.12)' },
}

const INPUT: React.CSSProperties = {
  background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none',
}

function diasParaVencer(fecha: string) {
  if (!fecha) return null
  const hoy   = new Date()
  const vence = new Date(fecha)
  return Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtFecha(f: string) {
  if (!f) return '—'
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ChoferesPage() {
  const [choferes,  setChoferes]  = useState<Chofer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filtroEst, setFiltroEst] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [editando,  setEditando]  = useState<Chofer | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [importando, setImportando] = useState(false)

  const [form, setForm] = useState({
    nombre_completo: '', tipo_licencia: 'E', vencimiento_licencia: '',
    telefono: '', estatus: 'disponible',
  })

  useEffect(() => { fetchChoferes() }, [])

  async function fetchChoferes() {
    setLoading(true)
    const { data } = await supabase
      .from('choferes')
      .select('*')
      .order('nombre_completo')
    if (data) setChoferes(data)
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre_completo: '', tipo_licencia: 'E', vencimiento_licencia: '', telefono: '', estatus: 'disponible' })
    setShowModal(true)
  }

  function abrirEditar(c: Chofer) {
    setEditando(c)
    setForm({
      nombre_completo:      c.nombre_completo,
      tipo_licencia:        c.tipo_licencia        || 'E',
      vencimiento_licencia: c.vencimiento_licencia || '',
      telefono:             c.telefono             || '',
      estatus:              c.estatus              || 'disponible',
    })
    setShowModal(true)
  }

  async function guardar() {
    if (!form.nombre_completo) return
    setGuardando(true)
    if (editando) {
      await supabase.from('choferes').update({ ...form }).eq('id', editando.id)
    } else {
      await supabase.from('choferes').insert({ ...form, activo: true })
    }
    await fetchChoferes()
    setShowModal(false)
    setGuardando(false)
  }

  async function toggleActivo(c: Chofer) {
    await supabase.from('choferes').update({ activo: !c.activo }).eq('id', c.id)
    setChoferes(cs => cs.map(x => x.id === c.id ? { ...x, activo: !c.activo } : x))
  }

  async function importarCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => obj[h] = vals[i] || '')
      return obj
    }).filter(r => r.nombre_completo || r.nombre)

    const inserts = rows.map(r => ({
      nombre_completo:      r.nombre_completo || r.nombre || '',
      tipo_licencia:        r.tipo_licencia   || r.licencia || 'E',
      vencimiento_licencia: r.vencimiento_licencia || r.vencimiento || null,
      telefono:             r.telefono        || '',
      estatus:              'disponible',
      activo:               true,
    }))

    if (inserts.length > 0) {
      await supabase.from('choferes').insert(inserts)
      await fetchChoferes()
    }
    setImportando(false)
    e.target.value = ''
  }

  const filtrados = choferes.filter(c => {
    const ms = !search || c.nombre_completo.toLowerCase().includes(search.toLowerCase())
    const me = filtroEst === 'todos' || c.estatus === filtroEst
    return ms && me
  })

  const alertas = choferes.filter(c => {
    const d = diasParaVencer(c.vencimiento_licencia)
    return d !== null && d <= 30 && d >= 0 && c.activo
  })

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Choferes</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{choferes.filter(c => c.activo).length} choferes activos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ background: '#1a1e2e', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {importando ? 'Importando...' : '↑ Importar CSV'}
            <input type="file" accept=".csv" onChange={importarCSV} style={{ display: 'none' }} />
          </label>
          <button onClick={abrirNuevo} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            + Nuevo chofer
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Alertas de vencimiento */}
        {alertas.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>⚠</span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#ef4444' }}>
                {alertas.length} licencia{alertas.length > 1 ? 's' : ''} por vencer en menos de 30 días
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {alertas.map(c => {
                const d = diasParaVencer(c.vencimiento_licencia)!
                return (
                  <div key={c.id} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 11 }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{c.nombre_completo}</span>
                    <span style={{ color: '#ef4444', marginLeft: 6 }}>vence en {d} día{d !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total activos',  value: choferes.filter(c => c.activo).length,                       color: '#e2e8f0' },
            { label: 'Disponibles',    value: choferes.filter(c => c.estatus === 'disponible').length,     color: '#34d399' },
            { label: 'En ruta',        value: choferes.filter(c => c.estatus === 'en_ruta').length,        color: '#fbbf24' },
            { label: 'Alertas lic.',   value: alertas.length,                                              color: alertas.length > 0 ? '#ef4444' : '#64748b' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', flex: 1 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input placeholder="Buscar chofer..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...INPUT, flex: 1, maxWidth: 300 }} />
          <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)} style={{ ...INPUT, width: 160 }}>
            <option value="todos">Todos los estatus</option>
            {Object.entries(ESTATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando choferes...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>◎</div>
              <div style={{ color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>No hay choferes</div>
              <div style={{ fontSize: 12 }}>Agrega tu primer chofer o importa desde CSV</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1a1e2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Chofer', 'Licencia', 'Vencimiento', 'Teléfono', 'Estatus', 'Activo', ''].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => {
                  const est  = ESTATUS[c.estatus] || ESTATUS['disponible']
                  const dias = diasParaVencer(c.vencimiento_licencia)
                  const venceProximo = dias !== null && dias <= 30 && dias >= 0
                  const vencido      = dias !== null && dias < 0
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: c.activo ? 1 : 0.4 }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {c.nombre_completo[0]}
                          </div>
                          <span style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{c.nombre_completo}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                          Lic. {c.tipo_licencia}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontSize: 12, color: vencido ? '#ef4444' : venceProximo ? '#f59e0b' : '#94a3b8' }}>
                          {fmtFecha(c.vencimiento_licencia)}
                        </div>
                        {venceProximo && <div style={{ fontSize: 10, color: '#f59e0b' }}>⚠ {dias} días</div>}
                        {vencido      && <div style={{ fontSize: 10, color: '#ef4444' }}>✕ Vencida</div>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8' }}>{c.telefono || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: est.bg, color: est.color, fontSize: 11, fontWeight: 600 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: est.color }}/>
                          {est.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <button onClick={() => toggleActivo(c)} style={{ background: c.activo ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${c.activo ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}`, color: c.activo ? '#34d399' : '#64748b', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => abrirEditar(c)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Editar</button>
                          <a href={`/choferes/${c.id}`} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}>Ver</a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal agregar/editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 20 }}>
              {editando ? 'Editar chofer' : 'Nuevo chofer'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Nombre completo *</label>
                <input style={{ ...INPUT, width: '100%' }} placeholder="Ej: Carlos Mendoza" value={form.nombre_completo} onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Tipo de licencia</label>
                  <select style={{ ...INPUT, width: '100%' }} value={form.tipo_licencia} onChange={e => setForm(f => ({ ...f, tipo_licencia: e.target.value }))}>
                    {['A','B','C','D','E'].map(t => <option key={t} value={t}>Licencia {t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Estatus</label>
                  <select style={{ ...INPUT, width: '100%' }} value={form.estatus} onChange={e => setForm(f => ({ ...f, estatus: e.target.value }))}>
                    {Object.entries(ESTATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Vencimiento de licencia</label>
                <input style={{ ...INPUT, width: '100%' }} type="date" value={form.vencimiento_licencia} onChange={e => setForm(f => ({ ...f, vencimiento_licencia: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Teléfono</label>
                <input style={{ ...INPUT, width: '100%' }} placeholder="55 1234 5678" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={guardar} disabled={!form.nombre_completo || guardando}
                style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear chofer'}
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