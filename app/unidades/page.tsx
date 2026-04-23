'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Unidad = {
  id: string
  placa: string
  tipo: string
  capacidad_kg: number
  capacidad_tarimas: number
  zonas_temp: string[]
  activo: boolean
}

const ZONAS: Record<string, { label: string; color: string; icon: string }> = {
  congelado:   { label: 'Congelado',   color: '#60a5fa', icon: '❄' },
  refrigerado: { label: 'Refrigerado', color: '#34d399', icon: '🌡' },
  ambiente:    { label: 'Ambiente',    color: '#fbbf24', icon: '☀' },
}

const TIPOS = ['Thermo King 48ft', 'Refrigerado 28ft', 'Caja Seca 48ft', 'Multizona 40ft', 'Rabon', 'Torton', 'Camioneta', 'Otro']

const INPUT: React.CSSProperties = {
  background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', width: '100%',
}
const LBL: React.CSSProperties = {
  fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em',
}

export default function UnidadesPage() {
  const [unidades,   setUnidades]   = useState<Unidad[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filtroZona, setFiltroZona] = useState('todos')
  const [showModal,  setShowModal]  = useState(false)
  const [editando,   setEditando]   = useState<Unidad | null>(null)
  const [guardando,  setGuardando]  = useState(false)
  const [importando, setImportando] = useState(false)

  const [form, setForm] = useState({
    placa: '', tipo: 'Thermo King 48ft',
    capacidad_kg: '', capacidad_tarimas: '',
    zonas_temp: [] as string[],
  })

  useEffect(() => { fetchUnidades() }, [])

  async function fetchUnidades() {
    setLoading(true)
    const { data } = await supabase.from('unidades').select('*').order('placa')
    if (data) setUnidades(data)
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ placa: '', tipo: 'Thermo King 48ft', capacidad_kg: '', capacidad_tarimas: '', zonas_temp: [] })
    setShowModal(true)
  }

  function abrirEditar(u: Unidad) {
    setEditando(u)
    setForm({
      placa:             u.placa,
      tipo:              u.tipo              || 'Thermo King 48ft',
      capacidad_kg:      String(u.capacidad_kg      || ''),
      capacidad_tarimas: String(u.capacidad_tarimas || ''),
      zonas_temp:        u.zonas_temp        || [],
    })
    setShowModal(true)
  }

  function toggleZona(z: string) {
    setForm(f => ({
      ...f,
      zonas_temp: f.zonas_temp.includes(z)
        ? f.zonas_temp.filter(x => x !== z)
        : [...f.zonas_temp, z],
    }))
  }

  async function guardar() {
    if (!form.placa) return
    setGuardando(true)
    const payload = {
      placa:             form.placa.toUpperCase(),
      tipo:              form.tipo,
      capacidad_kg:      form.capacidad_kg      ? Number(form.capacidad_kg)      : null,
      capacidad_tarimas: form.capacidad_tarimas ? Number(form.capacidad_tarimas) : null,
      zonas_temp:        form.zonas_temp,
      activo:            true,
    }
    if (editando) {
      await supabase.from('unidades').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('unidades').insert(payload)
    }
    await fetchUnidades()
    setShowModal(false)
    setGuardando(false)
  }

  async function toggleActivo(u: Unidad) {
    await supabase.from('unidades').update({ activo: !u.activo }).eq('id', u.id)
    setUnidades(us => us.map(x => x.id === u.id ? { ...x, activo: !u.activo } : x))
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
    }).filter(r => r.placa)

    const inserts = rows.map(r => ({
      placa:             r.placa.toUpperCase(),
      tipo:              r.tipo              || 'Otro',
      capacidad_kg:      r.capacidad_kg      ? Number(r.capacidad_kg)      : null,
      capacidad_tarimas: r.capacidad_tarimas ? Number(r.capacidad_tarimas) : null,
      zonas_temp:        r.zonas_temp        ? r.zonas_temp.split('|').map(z => z.trim()) : [],
      activo:            true,
    }))

    if (inserts.length > 0) {
      await supabase.from('unidades').insert(inserts)
      await fetchUnidades()
    }
    setImportando(false)
    e.target.value = ''
  }

  const filtradas = unidades.filter(u => {
    const ms = !search || u.placa.toLowerCase().includes(search.toLowerCase()) || (u.tipo || '').toLowerCase().includes(search.toLowerCase())
    const mz = filtroZona === 'todos' || (u.zonas_temp || []).includes(filtroZona)
    return ms && mz
  })

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Unidades</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{unidades.filter(u => u.activo).length} unidades activas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ background: '#1a1e2e', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {importando ? 'Importando...' : '↑ Importar CSV'}
            <input type="file" accept=".csv" onChange={importarCSV} style={{ display: 'none' }} />
          </label>
          <button onClick={abrirNuevo} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            + Nueva unidad
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total activas', value: unidades.filter(u => u.activo).length, color: '#e2e8f0' },
            { label: 'Con congelado', value: unidades.filter(u => (u.zonas_temp||[]).includes('congelado')).length, color: '#60a5fa' },
            { label: 'Refrigeradas',  value: unidades.filter(u => (u.zonas_temp||[]).includes('refrigerado')).length, color: '#34d399' },
            { label: 'Caja seca',     value: unidades.filter(u => (u.zonas_temp||[]).length === 1 && (u.zonas_temp||[]).includes('ambiente')).length, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', flex: 1 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input placeholder="Buscar por placa o tipo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...INPUT, width: 'auto', flex: 1, maxWidth: 300 }} />
          <select value={filtroZona} onChange={e => setFiltroZona(e.target.value)} style={{ ...INPUT, width: 170 }}>
            <option value="todos">Todas las zonas</option>
            {Object.entries(ZONAS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>

        {/* Grid de unidades */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando unidades...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>◻</div>
            <div style={{ color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>No hay unidades</div>
            <div style={{ fontSize: 12 }}>Agrega tu primera unidad o importa desde CSV</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtradas.map(u => (
              <div key={u.id} style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, opacity: u.activo ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>{u.placa}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{u.tipo}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => abrirEditar(u)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => toggleActivo(u)} style={{ background: u.activo ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${u.activo ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}`, color: u.activo ? '#34d399' : '#64748b', borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}>
                      {u.activo ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                </div>

                {/* Capacidad */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: '#1a1e2e', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Peso máx.</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
                      {u.capacidad_kg ? u.capacidad_kg.toLocaleString('es-MX') : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>kg</div>
                  </div>
                  <div style={{ flex: 1, background: '#1a1e2e', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Tarimas</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#818cf8' }}>
                      {u.capacidad_tarimas || '—'}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>1×1.20×1.60m</div>
                  </div>
                </div>

                {/* Zonas */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {(u.zonas_temp || []).map(z => (
                    <span key={z} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: ZONAS[z]?.color || '#94a3b8' }}>
                      {ZONAS[z]?.icon} {ZONAS[z]?.label || z}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: 460, maxWidth: '90vw' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 20 }}>
              {editando ? 'Editar unidad' : 'Nueva unidad'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Placa *</label>
                  <input style={INPUT} placeholder="ABC-123-A" value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value }))} />
                </div>
                <div>
                  <label style={LBL}>Tipo</label>
                  <select style={INPUT} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Capacidad (kg)</label>
                  <input style={INPUT} type="number" placeholder="20000" value={form.capacidad_kg} onChange={e => setForm(f => ({ ...f, capacidad_kg: e.target.value }))} />
                </div>
                <div>
                  <label style={LBL}>Tarimas (1×1.20×1.60m)</label>
                  <input style={INPUT} type="number" placeholder="Ej: 22" value={form.capacidad_tarimas} onChange={e => setForm(f => ({ ...f, capacidad_tarimas: e.target.value }))} />
                  {form.capacidad_tarimas && (
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                      ≈ {(Number(form.capacidad_tarimas) * 1.92).toFixed(1)} m³
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={LBL}>Zonas de temperatura</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(ZONAS).map(([k, v]) => (
                    <button key={k} onClick={() => toggleZona(k)} type="button"
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${form.zonas_temp.includes(k) ? v.color : 'rgba(255,255,255,0.1)'}`, background: form.zonas_temp.includes(k) ? `${v.color}18` : 'transparent', color: form.zonas_temp.includes(k) ? v.color : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: form.zonas_temp.includes(k) ? 600 : 400 }}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={guardar} disabled={!form.placa || guardando}
                style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear unidad'}
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