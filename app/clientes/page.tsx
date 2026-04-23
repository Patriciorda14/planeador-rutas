'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Cliente = {
  id: string
  razon_social: string
  direccion: string
  ciudad: string
  estado: string
  contacto: string
  telefono: string
  horario_entrega: string
  activo: boolean
}

const ESTADOS_MX = ['CDMX','Jalisco','Nuevo León','Puebla','Querétaro','Guanajuato','Chihuahua','Sonora','Veracruz','Coahuila','Tamaulipas','Baja California','Sinaloa','Oaxaca','Chiapas','Otro']

const INPUT: React.CSSProperties = {
  background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', width: '100%',
}
const LBL: React.CSSProperties = {
  fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em',
}

export default function ClientesPage() {
  const [clientes,   setClientes]   = useState<Cliente[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filtroEst,  setFiltroEst]  = useState('todos')
  const [showModal,  setShowModal]  = useState(false)
  const [editando,   setEditando]   = useState<Cliente | null>(null)
  const [guardando,  setGuardando]  = useState(false)
  const [importando, setImportando] = useState(false)

  const [form, setForm] = useState({
    razon_social: '', direccion: '', ciudad: '', estado: '',
    contacto: '', telefono: '', horario_entrega: '',
  })

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('razon_social')
    if (data) setClientes(data)
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ razon_social: '', direccion: '', ciudad: '', estado: '', contacto: '', telefono: '', horario_entrega: '' })
    setShowModal(true)
  }

  function abrirEditar(c: Cliente) {
    setEditando(c)
    setForm({
      razon_social:    c.razon_social    || '',
      direccion:       c.direccion       || '',
      ciudad:          c.ciudad          || '',
      estado:          c.estado          || '',
      contacto:        c.contacto        || '',
      telefono:        c.telefono        || '',
      horario_entrega: c.horario_entrega || '',
    })
    setShowModal(true)
  }

  async function guardar() {
    if (!form.razon_social) return
    setGuardando(true)
    if (editando) {
      await supabase.from('clientes').update({ ...form }).eq('id', editando.id)
    } else {
      await supabase.from('clientes').insert({ ...form, activo: true })
    }
    await fetchClientes()
    setShowModal(false)
    setGuardando(false)
  }

  async function toggleActivo(c: Cliente) {
    await supabase.from('clientes').update({ activo: !c.activo }).eq('id', c.id)
    setClientes(cs => cs.map(x => x.id === c.id ? { ...x, activo: !c.activo } : x))
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
    }).filter(r => r.razon_social || r.nombre)

    const inserts = rows.map(r => ({
      razon_social:    r.razon_social    || r.nombre || '',
      direccion:       r.direccion       || '',
      ciudad:          r.ciudad          || '',
      estado:          r.estado          || '',
      contacto:        r.contacto        || '',
      telefono:        r.telefono        || '',
      horario_entrega: r.horario_entrega || '',
      activo:          true,
    }))

    if (inserts.length > 0) {
      await supabase.from('clientes').insert(inserts)
      await fetchClientes()
    }
    setImportando(false)
    e.target.value = ''
  }

  const estados = Array.from(new Set(clientes.map(c => c.estado).filter(Boolean))).sort()

  const filtrados = clientes.filter(c => {
    const ms = !search ||
      c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      (c.ciudad || '').toLowerCase().includes(search.toLowerCase())
    const me = filtroEst === 'todos' || c.estado === filtroEst
    return ms && me
  })

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Clientes</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{clientes.filter(c => c.activo).length} clientes activos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ background: '#1a1e2e', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {importando ? 'Importando...' : '↑ Importar CSV'}
            <input type="file" accept=".csv" onChange={importarCSV} style={{ display: 'none' }} />
          </label>
          <button onClick={abrirNuevo} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total activos', value: clientes.filter(c => c.activo).length,  color: '#e2e8f0' },
            { label: 'Estados',       value: estados.length,                          color: '#818cf8' },
            { label: 'Inactivos',     value: clientes.filter(c => !c.activo).length, color: '#64748b' },
            { label: 'Total',         value: clientes.length,                         color: '#94a3b8' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', flex: 1 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input placeholder="Buscar por nombre o ciudad..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...INPUT, width: 'auto', flex: 1, maxWidth: 320 }} />
          <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)} style={{ ...INPUT, width: 180 }}>
            <option value="todos">Todos los estados</option>
            {estados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando clientes...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>◈</div>
              <div style={{ color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>No hay clientes</div>
              <div style={{ fontSize: 12 }}>Agrega tu primer cliente o importa desde CSV</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1a1e2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Cliente', 'Ciudad / Estado', 'Contacto', 'Teléfono', 'Horario', 'Activo', ''].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: c.activo ? 1 : 0.5 }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{c.razon_social}</div>
                      {c.direccion && <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{c.direccion}</div>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontSize: 12, color: '#e2e8f0' }}>{c.ciudad || '—'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{c.estado || ''}</div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8' }}>{c.contacto || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8' }}>{c.telefono || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8' }}>{c.horario_entrega || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <button onClick={() => toggleActivo(c)}
                        style={{ background: c.activo ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${c.activo ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}`, color: c.activo ? '#34d399' : '#64748b', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => abrirEditar(c)}
                          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Editar</button>
                        <a href={`/clientes/${c.id}`}
                          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}>Ver</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>Mostrando {filtrados.length} de {clientes.length} clientes</div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#131620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: 500, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 20 }}>
              {editando ? 'Editar cliente' : 'Nuevo cliente'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={LBL}>Razón social *</label>
                <input style={INPUT} placeholder="Ej: Farmacias del Ahorro" value={form.razon_social} onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))} />
              </div>
              <div>
                <label style={LBL}>Dirección</label>
                <input style={INPUT} placeholder="Calle, número, colonia" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Ciudad</label>
                  <input style={INPUT} placeholder="Ej: Guadalajara" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
                </div>
                <div>
                  <label style={LBL}>Estado</label>
                  <select style={INPUT} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                    <option value="">— Selecciona —</option>
                    {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Contacto</label>
                  <input style={INPUT} placeholder="Nombre del contacto" value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
                </div>
                <div>
                  <label style={LBL}>Teléfono</label>
                  <input style={INPUT} placeholder="55 1234 5678" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={LBL}>Horario de entrega</label>
                <input style={INPUT} placeholder="Ej: Lun-Vie 8:00-17:00" value={form.horario_entrega} onChange={e => setForm(f => ({ ...f, horario_entrega: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={guardar} disabled={!form.razon_social || guardando}
                style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear cliente'}
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