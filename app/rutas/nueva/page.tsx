'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Chofer   = { id: string; nombre_completo: string; tipo_licencia: string; estatus: string }
type Unidad   = { id: string; placa: string; tipo: string; capacidad_kg: number; zonas_temp: string[] }
type Cliente  = { id: string; razon_social: string; ciudad: string; estado: string }
type Producto = { nombre: string; sku: string; cantidad: string; valor_unitario: string }
type Parada   = {
  cliente_id: string; cliente_nombre: string; cliente_ciudad: string
  zona_temp: string; peso_kg: string; hora_estimada: string; notas: string
  productos: Producto[]
}

const ZONAS: Record<string, { label: string; color: string; icon: string }> = {
  congelado:   { label: 'Congelado',   color: '#60a5fa', icon: '❄' },
  refrigerado: { label: 'Refrigerado', color: '#34d399', icon: '🌡' },
  ambiente:    { label: 'Ambiente',    color: '#fbbf24', icon: '☀' },
}

const CARD: React.CSSProperties = {
  background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20,
}
const INPUT: React.CSSProperties = {
  width: '100%', background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none',
}
const LBL: React.CSSProperties = {
  fontSize: 10, color: '#64748b', marginBottom: 4, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '.04em', display: 'block',
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function valorTotalParada(p: Parada) {
  return p.productos.reduce((s, pr) => s + (Number(pr.cantidad) || 0) * (Number(pr.valor_unitario) || 0), 0)
}

const PROD_VACIO: Producto = { nombre: '', sku: '', cantidad: '', valor_unitario: '' }

export default function NuevaRutaPage() {
  const router = useRouter()

  const [choferes,  setChoferes]  = useState<Chofer[]>([])
  const [unidades,  setUnidades]  = useState<Unidad[]>([])
  const [clientes,  setClientes]  = useState<Cliente[]>([])
  const [paradas,   setParadas]   = useState<Parada[]>([])
  const [showAdd,   setShowAdd]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')

  const [form, setForm] = useState({
    nombre: '', origen: 'CEDIS Toluca', fecha_salida: '',
    chofer_id: '', unidad_id: '', km_estimados: '', costo_presupuesto: '', notas: '',
  })

  const [np, setNp] = useState({
    cliente_id: '', zona_temp: 'refrigerado', peso_kg: '', hora_estimada: '', notas: '',
    productos: [{ ...PROD_VACIO }] as Producto[],
  })

  useEffect(() => {
    supabase.from('choferes').select('*').eq('activo', true).then(({ data }) => data && setChoferes(data))
    supabase.from('unidades').select('*').eq('activo', true).then(({ data }) => data && setUnidades(data))
    supabase.from('clientes').select('*').eq('activo', true).then(({ data }) => data && setClientes(data))
  }, [])

  function upd(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function updProd(i: number, k: keyof Producto, v: string) {
    setNp(p => {
      const prods = [...p.productos]
      prods[i] = { ...prods[i], [k]: v }
      return { ...p, productos: prods }
    })
  }

  function addProd() { setNp(p => ({ ...p, productos: [...p.productos, { ...PROD_VACIO }] })) }
  function rmProd(i: number) { setNp(p => ({ ...p, productos: p.productos.filter((_, j) => j !== i) })) }

  function addParada() {
    if (!np.cliente_id) return
    const cl = clientes.find(c => c.id === np.cliente_id)
    if (!cl) return
    const prodsValidos = np.productos.filter(p => p.nombre.trim())
    setParadas(ps => [...ps, {
      ...np, productos: prodsValidos,
      cliente_nombre: cl.razon_social, cliente_ciudad: cl.ciudad,
    }])
    setNp({ cliente_id: '', zona_temp: 'refrigerado', peso_kg: '', hora_estimada: '', notas: '', productos: [{ ...PROD_VACIO }] })
    setShowAdd(false)
  }

  const valorTotalCarga = paradas.reduce((s, p) => s + valorTotalParada(p), 0)
  const margenEsperado  = valorTotalCarga * 0.0125
  const presupuesto     = Number(form.costo_presupuesto) || 0
  const totalKg         = paradas.reduce((s, p) => s + (Number(p.peso_kg) || 0), 0)
  const unidad          = unidades.find(u => u.id === form.unidad_id)
  const chofer          = choferes.find(c => c.id === form.chofer_id)
  const pct             = unidad ? Math.min((totalKg / unidad.capacidad_kg) * 100, 100) : 0
  const over            = unidad ? totalKg > unidad.capacidad_kg : false
  const margenVsPres    = presupuesto > 0 ? ((margenEsperado - presupuesto) / presupuesto) * 100 : null

  async function guardar() {
    if (!form.nombre) { setError('El nombre es obligatorio'); return }
    setGuardando(true); setError('')

    const folio = `RT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`

    const { data: ruta, error: e } = await supabase
      .from('rutas')
      .insert({
        folio,
        nombre:            form.nombre,
        origen:            form.origen            || null,
        fecha_salida:      form.fecha_salida       || null,
        chofer_id:         form.chofer_id          || null,
        unidad_id:         form.unidad_id          || null,
        km_estimados:      form.km_estimados       ? Number(form.km_estimados)      : null,
        costo_presupuesto: form.costo_presupuesto  ? Number(form.costo_presupuesto) : null,
        notas:             form.notas              || null,
        estatus:           'en_creacion',
      })
      .select()
      .single()

    if (e || !ruta) { setError('Error al guardar. Intenta de nuevo.'); setGuardando(false); return }

    if (paradas.length > 0) {
      const { data: paradasGuardadas } = await supabase.from('paradas').insert(
        paradas.map((p, i) => ({
          ruta_id:    ruta.id,
          cliente_id: p.cliente_id || null,
          orden:      i + 1,
          zona_temp:  p.zona_temp,
          peso_kg:    p.peso_kg ? Number(p.peso_kg) : 0,
          notas:      p.notas || null,
        }))
      ).select()

      if (paradasGuardadas) {
        const cargas = paradasGuardadas.flatMap((pg, i) =>
          paradas[i].productos.filter(pr => pr.nombre.trim()).map(pr => ({
            parada_id:     pg.id,
            producto:      pr.nombre,
            sku:           pr.sku || null,
            cantidad:      Number(pr.cantidad) || 1,
            unidad_medida: 'pza',
            peso_kg:       0,
            zona_temp:     paradas[i].zona_temp as 'congelado' | 'refrigerado' | 'ambiente',
          }))
        )
        if (cargas.length > 0) await supabase.from('cargas').insert(cargas)
      }
    }

    router.push(`/rutas/${ruta.id}`)
  }

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Nueva ruta</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Completa la información y agrega las paradas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/rutas" style={{ background: '#1a1e2e', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Cancelar</a>
          <button onClick={guardar} disabled={guardando} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar ruta'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', marginBottom: 14, fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>

          {/* ── IZQUIERDA ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Info general */}
            <div style={CARD}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Información general
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={LBL}>Nombre de la ruta *</label>
                  <input style={INPUT} placeholder="Ej: Ruta Hospitales Norte" value={form.nombre} onChange={e => upd('nombre', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Origen</label>
                  <input style={INPUT} value={form.origen} onChange={e => upd('origen', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Fecha y hora de salida</label>
                  <input style={INPUT} type="datetime-local" value={form.fecha_salida} onChange={e => upd('fecha_salida', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Km estimados</label>
                  <input style={INPUT} type="number" placeholder="0" value={form.km_estimados} onChange={e => upd('km_estimados', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Presupuesto de ruta (MXN)</label>
                  <input style={INPUT} type="number" placeholder="0.00" value={form.costo_presupuesto} onChange={e => upd('costo_presupuesto', e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={LBL}>Notas internas</label>
                  <textarea style={{ ...INPUT, resize: 'vertical' }} rows={2} placeholder="Observaciones..." value={form.notas} onChange={e => upd('notas', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Paradas */}
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
                  Paradas ({paradas.length})
                  {paradas.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>
                      {totalKg.toLocaleString('es-MX')} kg total
                    </span>
                  )}
                </span>
                <button onClick={() => setShowAdd(true)} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
                  + Agregar parada
                </button>
              </div>

              {paradas.length === 0 && !showAdd && (
                <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 10, padding: 28, textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
                  <div style={{ fontWeight: 500, color: '#94a3b8', marginBottom: 3 }}>Sin paradas</div>
                  <div style={{ fontSize: 12 }}>Agrega la primera parada de esta ruta</div>
                </div>
              )}

              {paradas.map((p, i) => {
                const vp = valorTotalParada(p)
                return (
                  <div key={i} style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, color: '#e2e8f0' }}>{p.cliente_nombre}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{p.cliente_ciudad}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: ZONAS[p.zona_temp]?.color }}>{ZONAS[p.zona_temp]?.icon} {ZONAS[p.zona_temp]?.label}</span>
                          {p.peso_kg && <span style={{ fontSize: 10, color: '#64748b' }}>⚖ {p.peso_kg} kg</span>}
                          {p.productos.length > 0 && <span style={{ fontSize: 10, color: '#64748b' }}>📦 {p.productos.length} producto{p.productos.length > 1 ? 's' : ''}</span>}
                          {vp > 0 && <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>{fmt(vp)}</span>}
                        </div>
                      </div>
                      <button onClick={() => setParadas(ps => ps.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 16, cursor: 'pointer' }}>×</button>
                    </div>
                    {p.productos.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px 10px 44px' }}>
                        {p.productos.map((pr, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', padding: '2px 0' }}>
                            <span>{pr.nombre} {pr.sku ? `(${pr.sku})` : ''}</span>
                            <span style={{ color: '#64748b' }}>{pr.cantidad} × {pr.valor_unitario ? fmt(Number(pr.valor_unitario)) : '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Formulario nueva parada */}
              {showAdd && (
                <div style={{ background: '#1f2537', border: '1px solid #6366f1', borderRadius: 10, padding: 16, marginTop: 8 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, color: '#818cf8', marginBottom: 12 }}>Nueva parada</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={LBL}>Cliente *</label>
                      <select style={INPUT} value={np.cliente_id} onChange={e => setNp(p => ({ ...p, cliente_id: e.target.value }))}>
                        <option value="">— Selecciona cliente —</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social} — {c.ciudad}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Zona temperatura</label>
                      <select style={INPUT} value={np.zona_temp} onChange={e => setNp(p => ({ ...p, zona_temp: e.target.value }))}>
                        {Object.entries(ZONAS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Peso total (kg)</label>
                      <input style={INPUT} type="number" placeholder="0" value={np.peso_kg} onChange={e => setNp(p => ({ ...p, peso_kg: e.target.value }))} />
                    </div>
                  </div>

                  {/* Productos */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ ...LBL, margin: 0 }}>Productos / Carga</label>
                      <button onClick={addProd} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: 11, cursor: 'pointer' }}>+ Agregar producto</button>
                    </div>
                    {np.productos.map((pr, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                        <input style={INPUT} placeholder="Nombre del producto" value={pr.nombre} onChange={e => updProd(i, 'nombre', e.target.value)} />
                        <input style={INPUT} placeholder="SKU" value={pr.sku} onChange={e => updProd(i, 'sku', e.target.value)} />
                        <input style={INPUT} type="number" placeholder="Cant." value={pr.cantidad} onChange={e => updProd(i, 'cantidad', e.target.value)} />
                        <input style={INPUT} type="number" placeholder="Valor unit." value={pr.valor_unitario} onChange={e => updProd(i, 'valor_unitario', e.target.value)} />
                        <button onClick={() => rmProd(i)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
                      </div>
                    ))}
                    {np.productos.some(p => Number(p.cantidad) > 0 && Number(p.valor_unitario) > 0) && (
                      <div style={{ textAlign: 'right', fontSize: 11, color: '#34d399', marginTop: 4 }}>
                        Valor de esta parada: {fmt(np.productos.reduce((s, p) => s + (Number(p.cantidad) || 0) * (Number(p.valor_unitario) || 0), 0))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addParada} disabled={!np.cliente_id} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>Agregar parada</button>
                    <button onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </div>
              )}

              {unidad && paradas.length > 0 && (
                <div style={{ marginTop: 12, background: '#1a1e2e', border: `1px solid ${over ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '11px 13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 11, color: over ? '#ef4444' : '#e2e8f0' }}>{over ? '⚠ Sobrecarga' : 'Capacidad'}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{totalKg.toLocaleString('es-MX')} / {unidad.capacidad_kg.toLocaleString('es-MX')} kg</span>
                  </div>
                  <div style={{ height: 5, background: '#0c0e14', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: over ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── DERECHA ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Panel financiero */}
            {(valorTotalCarga > 0 || presupuesto > 0) && (
              <div style={{ ...CARD, border: '1px solid rgba(99,102,241,0.3)' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  Análisis financiero
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Valor total de la carga</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{fmt(valorTotalCarga)}</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Margen esperado (1.25%)</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#10b981' }}>{fmt(margenEsperado)}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>= Valor carga × 1.25%</div>
                </div>
                {presupuesto > 0 && margenVsPres !== null && (
                  <div style={{ background: margenVsPres >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${margenVsPres >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Margen vs presupuesto</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>Presupuesto ruta</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{fmt(presupuesto)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: '#64748b' }}>Margen esperado</span>
                      <span style={{ color: '#10b981', fontWeight: 500 }}>{fmt(margenEsperado)}</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Diferencia</span>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: margenVsPres >= 0 ? '#10b981' : '#ef4444' }}>
                        {margenVsPres >= 0 ? '+' : ''}{margenVsPres.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
                {paradas.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Desglose por parada</div>
                    {paradas.map((p, i) => {
                      const vp = valorTotalParada(p)
                      const pctP = valorTotalCarga > 0 ? (vp / valorTotalCarga) * 100 : 0
                      return (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: '#94a3b8' }}>{i + 1}. {p.cliente_nombre}</span>
                            <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{fmt(vp)}</span>
                          </div>
                          <div style={{ height: 3, background: '#1a1e2e', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pctP}%`, background: '#6366f1', borderRadius: 2 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Asignación */}
            <div style={CARD}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Asignación</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={LBL}>Chofer</label>
                  <select style={INPUT} value={form.chofer_id} onChange={e => upd('chofer_id', e.target.value)}>
                    <option value="">— Sin asignar —</option>
                    {choferes.map(c => (
                      <option key={c.id} value={c.id} disabled={c.estatus === 'en_ruta'}>
                        {c.nombre_completo}{c.estatus === 'en_ruta' ? ' (en ruta)' : ''} · Lic. {c.tipo_licencia}
                      </option>
                    ))}
                  </select>
                </div>
                {chofer && (
                  <div style={{ background: '#1a1e2e', borderRadius: 8, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{chofer.nombre_completo[0]}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0' }}>{chofer.nombre_completo}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Licencia {chofer.tipo_licencia} · {chofer.estatus}</div>
                    </div>
                  </div>
                )}
                <div>
                  <label style={LBL}>Unidad</label>
                  <select style={INPUT} value={form.unidad_id} onChange={e => upd('unidad_id', e.target.value)}>
                    <option value="">— Sin asignar —</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.placa} · {u.tipo}</option>)}
                  </select>
                </div>
                {unidad && (
                  <div style={{ background: '#1a1e2e', borderRadius: 8, padding: '9px 11px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0', marginBottom: 4 }}>{unidad.tipo}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 5 }}>⚖ {unidad.capacidad_kg.toLocaleString('es-MX')} kg</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {unidad.zonas_temp?.map((z: string) => (
                        <span key={z} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: ZONAS[z]?.color }}>{ZONAS[z]?.icon} {ZONAS[z]?.label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen */}
            <div style={CARD}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 13, paddingBottom: 11, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Resumen</div>
              {([
                ['Nombre',         form.nombre || '—'],
                ['Paradas',        paradas.length],
                ['Km est.',        form.km_estimados ? `${form.km_estimados} km` : '—'],
                ['Presupuesto',    presupuesto ? fmt(presupuesto) : '—'],
                ['Valor carga',    valorTotalCarga > 0 ? fmt(valorTotalCarga) : '—'],
                ['Margen (1.25%)', margenEsperado > 0 ? fmt(margenEsperado) : '—'],
                ['Estatus',        'En creación'],
              ] as [string, string | number][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ fontWeight: 500, color: k === 'Margen (1.25%)' ? '#10b981' : '#e2e8f0' }}>{v}</span>
                </div>
              ))}
              <button onClick={guardar} disabled={!form.nombre || guardando}
                style={{ width: '100%', marginTop: 14, background: form.nombre ? '#6366f1' : '#1a1e2e', color: form.nombre ? '#fff' : '#64748b', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 500, cursor: form.nombre ? 'pointer' : 'not-allowed' }}>
                {guardando ? 'Guardando...' : '✓ Crear ruta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}