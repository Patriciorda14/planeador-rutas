'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Cliente = { id: string; razon_social: string; ciudad: string; estado: string }

type Destinatario = {
  cliente_id: string
  cliente_nombre: string
  cliente_ciudad: string
  productos: string
  peso_kg: string
  valor: string
}

const PAQUETERIAS = ['FedEx', 'DHL', 'Estafeta', 'RedPack', 'Paquetexpress', 'J&T Express', 'Otra']

const INPUT: React.CSSProperties = {
  width: '100%', background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none',
}
const LBL: React.CSSProperties = {
  fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em',
}
const CARD: React.CSSProperties = {
  background: '#131620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20,
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

export default function NuevoEnvioPage() {
  const router = useRouter()
  const [clientes,  setClientes]  = useState<Cliente[]>([])
  const [destinos,  setDestinos]  = useState<Destinatario[]>([])
  const [showAdd,   setShowAdd]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')

  const [form, setForm] = useState({
    paqueteria: 'FedEx', numero_guia: '',
    fecha_envio: '', fecha_entrega_est: '',
    origen: 'CEDIS Toluca',
    destino_ciudad: '', destino_estado: '',
    peso_kg: '', costo_envio: '', valor_carga: '',
    empaque_pasivo: false, tipo_empaque: '', notas: '',
  })

  const [nd, setNd] = useState({
    cliente_id: '', productos: '', peso_kg: '', valor: '',
  })

  useEffect(() => {
    supabase.from('clientes').select('*').eq('activo', true).order('razon_social')
      .then(({ data }) => data && setClientes(data))
  }, [])

  function upd(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  function addDestino() {
    if (!nd.cliente_id) return
    const cl = clientes.find(c => c.id === nd.cliente_id)
    if (!cl) return
    setDestinos(ds => [...ds, { ...nd, cliente_nombre: cl.razon_social, cliente_ciudad: cl.ciudad }])
    setNd({ cliente_id: '', productos: '', peso_kg: '', valor: '' })
    setShowAdd(false)
  }

const valorTotalCarga = destinos.length > 0
  ? destinos.reduce((s, d) => s + (Number(d.valor) || 0), 0)
  : (Number(form.valor_carga) || 0)
  const margenEsperado  = valorTotalCarga * 0.0125
  const costoEnvio      = Number(form.costo_envio) || 0
  const rentabilidad    = margenEsperado - costoEnvio

  async function guardar() {
    if (!form.paqueteria) { setError('La paquetería es obligatoria'); return }
    if (destinos.length === 0 && !form.destino_ciudad) { setError('Agrega al menos un destinatario o ciudad de destino'); return }
    setGuardando(true); setError('')

    const folio = `PKT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
    const pesoTotal = destinos.reduce((s, d) => s + (Number(d.peso_kg) || 0), 0) + (Number(form.peso_kg) || 0)
    const valorTotal = destinos.length > 0
  ? destinos.reduce((s, d) => s + (Number(d.valor) || 0), 0)
  : (Number(form.valor_carga) || 0)

    const ciudadDestino = form.destino_ciudad || destinos[0]?.cliente_ciudad || ''

    const { data: envio, error: e } = await supabase
      .from('envios')
      .insert({
        folio,
        paqueteria:        form.paqueteria,
        numero_guia:       form.numero_guia       || null,
        fecha_envio:       form.fecha_envio        || null,
        fecha_entrega_est: form.fecha_entrega_est  || null,
        origen:            form.origen,
        destino_ciudad:    ciudadDestino,
        destino_estado:    form.destino_estado     || null,
        peso_kg:           pesoTotal               || null,
        costo_envio:       costoEnvio              || null,
        valor_carga:       valorTotal              || null,
        empaque_pasivo:    form.empaque_pasivo,
        tipo_empaque:      form.tipo_empaque        || null,
        notas:             form.notas              || null,
        creado_por:        process.env.NEXT_PUBLIC_USUARIO_NOMBRE || 'Sistema',
        estatus:           'pendiente',
      })
      .select()
      .single()

    if (e || !envio) { setError('Error al guardar. Intenta de nuevo.'); setGuardando(false); return }

    if (destinos.length > 0) {
      await supabase.from('envio_destinatarios').insert(
        destinos.map(d => ({
          envio_id:   envio.id,
          cliente_id: d.cliente_id || null,
          productos:  d.productos  || null,
          peso_kg:    d.peso_kg    ? Number(d.peso_kg) : null,
          valor:      d.valor      ? Number(d.valor)   : null,
        }))
      )
    }

    router.push(`/paqueteria/${envio.id}`)
  }

  return (
    <div>
      {/* Topbar */}
      <div style={{ background: '#131620', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Nuevo envío</h1>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Registra un envío por paquetería</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/paqueteria" style={{ background: '#1a1e2e', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Cancelar</a>
          <button onClick={guardar} disabled={guardando}
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar envío'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', marginBottom: 14, fontSize: 12 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>

          {/* IZQUIERDA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Info del envío */}
            <div style={CARD}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Información del envío</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Paquetería *</label>
                  <select style={INPUT} value={form.paqueteria} onChange={e => upd('paqueteria', e.target.value)}>
                    {PAQUETERIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Número de guía</label>
                  <input style={INPUT} placeholder="Ej: 7489234723847" value={form.numero_guia} onChange={e => upd('numero_guia', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Fecha de envío</label>
                  <input style={INPUT} type="date" value={form.fecha_envio} onChange={e => upd('fecha_envio', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Fecha entrega estimada</label>
                  <input style={INPUT} type="date" value={form.fecha_entrega_est} onChange={e => upd('fecha_entrega_est', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Origen</label>
                  <input style={INPUT} value={form.origen} onChange={e => upd('origen', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Ciudad destino</label>
                  <input style={INPUT} placeholder="Ej: Monterrey" value={form.destino_ciudad} onChange={e => upd('destino_ciudad', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Peso total (kg)</label>
                  <input style={INPUT} type="number" placeholder="0" value={form.peso_kg} onChange={e => upd('peso_kg', e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Costo del envío (MXN)</label>
                  <input style={INPUT} type="number" placeholder="0.00" value={form.costo_envio} onChange={e => upd('costo_envio', e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={LBL}>Valor de la carga (MXN)</label>
                  <input style={INPUT} type="number" placeholder="0.00" value={form.valor_carga} onChange={e => upd('valor_carga', e.target.value)} />
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Se usa para calcular el margen esperado (×1.25%)</div>
                </div>
              </div>
            </div>

            {/* Empaque pasivo */}
            <div style={CARD}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Empaque pasivo</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => upd('empaque_pasivo', true)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${form.empaque_pasivo ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.1)'}`, background: form.empaque_pasivo ? 'rgba(96,165,250,0.08)' : 'transparent', color: form.empaque_pasivo ? '#60a5fa' : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: form.empaque_pasivo ? 600 : 400 }}>
                  ❄ Con empaque pasivo
                </button>
                <button onClick={() => upd('empaque_pasivo', false)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${!form.empaque_pasivo ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`, background: !form.empaque_pasivo ? 'rgba(251,191,36,0.08)' : 'transparent', color: !form.empaque_pasivo ? '#fbbf24' : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: !form.empaque_pasivo ? 600 : 400 }}>
                  ☀ Sin empaque pasivo
                </button>
              </div>
              {form.empaque_pasivo && (
                <div>
                  <label style={LBL}>Tipo de empaque</label>
                  <input style={INPUT} placeholder="Ej: Caja térmica + gel refrigerante 48h" value={form.tipo_empaque} onChange={e => upd('tipo_empaque', e.target.value)} />
                </div>
              )}
            </div>

            {/* Destinatarios */}
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
                  Destinatarios ({destinos.length})
                </span>
                <button onClick={() => setShowAdd(true)}
                  style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
                  + Agregar destinatario
                </button>
              </div>

              {destinos.length === 0 && !showAdd && (
                <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 10, padding: 24, textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📦</div>
                  <div style={{ fontWeight: 500, color: '#94a3b8', marginBottom: 3 }}>Sin destinatarios</div>
                  <div style={{ fontSize: 12 }}>Para envíos consolidados agrega varios destinatarios</div>
                </div>
              )}

              {destinos.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: '#e2e8f0' }}>{d.cliente_nombre}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{d.cliente_ciudad}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {d.productos && <span style={{ fontSize: 10, color: '#94a3b8' }}>📦 {d.productos}</span>}
                      {d.peso_kg   && <span style={{ fontSize: 10, color: '#64748b' }}>⚖ {d.peso_kg} kg</span>}
                      {d.valor     && <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>${Number(d.valor).toLocaleString('es-MX')}</span>}
                    </div>
                  </div>
                  <button onClick={() => setDestinos(ds => ds.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 16, cursor: 'pointer' }}>×</button>
                </div>
              ))}

              {showAdd && (
                <div style={{ background: '#1f2537', border: '1px solid #6366f1', borderRadius: 10, padding: 14, marginTop: 8 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 12, color: '#818cf8', marginBottom: 10 }}>Nuevo destinatario</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 10 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={LBL}>Cliente *</label>
                      <select style={INPUT} value={nd.cliente_id} onChange={e => setNd(d => ({ ...d, cliente_id: e.target.value }))}>
                        <option value="">— Selecciona cliente —</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social} — {c.ciudad}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={LBL}>Productos</label>
                      <input style={INPUT} placeholder="Descripción de los productos" value={nd.productos} onChange={e => setNd(d => ({ ...d, productos: e.target.value }))} />
                    </div>
                    <div>
                      <label style={LBL}>Peso (kg)</label>
                      <input style={INPUT} type="number" placeholder="0" value={nd.peso_kg} onChange={e => setNd(d => ({ ...d, peso_kg: e.target.value }))} />
                    </div>
                    <div>
                      <label style={LBL}>Valor (MXN)</label>
                      <input style={INPUT} type="number" placeholder="0.00" value={nd.valor} onChange={e => setNd(d => ({ ...d, valor: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addDestino} disabled={!nd.cliente_id}
                      style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>Agregar</button>
                    <button onClick={() => setShowAdd(false)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Notas */}
            <div style={CARD}>
              <label style={LBL}>Notas internas</label>
              <textarea style={{ ...INPUT, resize: 'vertical' }} rows={2} placeholder="Instrucciones especiales, observaciones..." value={form.notas} onChange={e => upd('notas', e.target.value)} />
            </div>
          </div>

          {/* DERECHA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Análisis financiero */}
            {(valorTotalCarga > 0 || costoEnvio > 0) && (
              <div style={{ ...CARD, border: '1px solid rgba(99,102,241,0.3)' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Análisis financiero</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Valor de la carga</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{fmt(valorTotalCarga)}</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Margen esperado (1.25%)</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#10b981' }}>{fmt(margenEsperado)}</div>
                </div>
                {costoEnvio > 0 && (
                  <div style={{ background: rentabilidad >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${rentabilidad >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Rentabilidad neta</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#64748b' }}>Margen</span>
                      <span style={{ color: '#10b981' }}>{fmt(margenEsperado)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
                      <span style={{ color: '#64748b' }}>Costo paquetería</span>
                      <span style={{ color: '#ef4444' }}>− {fmt(costoEnvio)}</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }}/>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Resultado</span>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: rentabilidad >= 0 ? '#34d399' : '#ef4444' }}>{fmt(rentabilidad)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resumen */}
            <div style={CARD}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 13, paddingBottom: 11, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Resumen</div>
              {([
                ['Paquetería',    form.paqueteria || '—'],
                ['Guía',         form.numero_guia || '—'],
                ['Destinatarios', destinos.length],
                ['Peso total',   form.peso_kg ? `${form.peso_kg} kg` : '—'],
                ['Costo envío',  costoEnvio ? fmt(costoEnvio) : '—'],
                ['Empaque',      form.empaque_pasivo ? 'Con empaque pasivo' : 'Sin empaque pasivo'],
                ['Estatus',      'Pendiente'],
              ] as [string, string | number][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{v}</span>
                </div>
              ))}
              <button onClick={guardar} disabled={guardando}
                style={{ width: '100%', marginTop: 14, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : '✓ Crear envío'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}