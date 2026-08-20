import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import NavBar from '../components/NavBar'
import AiChat from '../components/AiChat'
import { fetchProperties, createProperty } from '../lib/api'

const TYPE_COLOR: Record<string, string> = {
  residential: '#a78bfa',
  commercial: '#34d399',
  industrial: '#f59e0b',
  land: '#60a5fa',
}

const TYPE_LABEL: Record<string, string> = {
  residential: '住宅',
  commercial: '商業',
  industrial: '工業',
  land: '土地',
}

interface Property {
  id: string
  name: string
  type: string
  price: number | null
  status: string
  area_sqm: number | null
}

export default function Estate() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [bbox, setBbox] = useState<number[] | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [drawMode, setDrawMode] = useState(false)
  const [vertices, setVertices] = useState<[number, number][]>([])
  const [registerForm, setRegisterForm] = useState<{ name: string; type: string; price: string; owner: string } | null>(null)
  const verticesRef = useRef<[number, number][]>([])

  useEffect(() => { verticesRef.current = vertices }, [vertices])

  useEffect(() => {
    if (!mapContainer.current) return
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [135.4988, 34.7021],
      zoom: 13,
    })
    map.current.addControl(new maplibregl.NavigationControl())
    map.current.on('moveend', updateBbox)
    map.current.on('load', () => { updateBbox(); loadProperties() })
    return () => map.current?.remove()
  }, [])

  function updateBbox() {
    if (!map.current) return
    const b = map.current.getBounds()
    setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
  }

  async function loadProperties() {
    const data = await fetchProperties()
    setProperties(data.features?.map((f: { properties: Property }) => f.properties) || [])
    renderPolygons(data)
  }

  function renderPolygons(geojson: { features: Array<unknown> }) {
    if (!map.current || !map.current.isStyleLoaded()) return
    ;['properties-layer', 'properties-outline', 'draw-layer', 'draw-outline'].forEach(id => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id)
    })
    ;['properties', 'draw-preview'].forEach(id => {
      if (map.current!.getSource(id)) map.current!.removeSource(id)
    })

    map.current.addSource('properties', { type: 'geojson', data: geojson as GeoJSON.GeoJSON })
    map.current.addLayer({
      id: 'properties-layer', type: 'fill', source: 'properties',
      paint: {
        'fill-color': ['match', ['get', 'type'],
          'residential', TYPE_COLOR.residential, 'commercial', TYPE_COLOR.commercial,
          'industrial', TYPE_COLOR.industrial, 'land', TYPE_COLOR.land, '#94a3b8'],
        'fill-opacity': 0.5,
      },
    })
    map.current.addLayer({
      id: 'properties-outline', type: 'line', source: 'properties',
      paint: { 'line-color': '#fff', 'line-width': 1.5, 'line-opacity': 0.6 },
    })
  }

  const updateDrawPreview = useCallback((verts: [number, number][]) => {
    if (!map.current) return
    if (map.current.getLayer('draw-outline')) map.current.removeLayer('draw-outline')
    if (map.current.getLayer('draw-layer')) map.current.removeLayer('draw-layer')
    if (map.current.getSource('draw-preview')) map.current.removeSource('draw-preview')
    if (verts.length < 2) return

    const coords = verts.length >= 3
      ? [...verts, verts[0]]
      : [...verts, verts[verts.length - 1]]

    map.current.addSource('draw-preview', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} },
    })
    map.current.addLayer({
      id: 'draw-outline', type: 'line', source: 'draw-preview',
      paint: { 'line-color': '#38bdf8', 'line-width': 2, 'line-dasharray': [3, 2] },
    })
  }, [])

  useEffect(() => {
    if (!map.current) return
    if (!drawMode) {
      map.current.getCanvas().style.cursor = ''
      return
    }
    map.current.getCanvas().style.cursor = 'crosshair'

    function handleClick(e: maplibregl.MapMouseEvent) {
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      setVertices(prev => {
        const next = [...prev, coord]
        updateDrawPreview(next)
        return next
      })
    }
    function handleDblClick(e: maplibregl.MapMouseEvent) {
      e.preventDefault()
      const current = verticesRef.current
      if (current.length < 3) return
      const polygon = {
        type: 'Polygon',
        coordinates: [[...current, current[0]]],
      }
      setDrawMode(false)
      setRegisterForm({ name: '', type: 'commercial', price: '', owner: '' })
      // store polygon in pendingPolygonRef via state
      setPendingPolygon(polygon)
      setVertices([])
      // clear preview
      if (map.current) {
        if (map.current.getLayer('draw-outline')) map.current.removeLayer('draw-outline')
        if (map.current.getSource('draw-preview')) map.current.removeSource('draw-preview')
      }
    }

    map.current.on('click', handleClick)
    map.current.on('dblclick', handleDblClick)
    return () => {
      map.current?.off('click', handleClick)
      map.current?.off('dblclick', handleDblClick)
      map.current && (map.current.getCanvas().style.cursor = '')
    }
  }, [drawMode, updateDrawPreview])

  const [pendingPolygon, setPendingPolygon] = useState<object | null>(null)

  async function handleRegister() {
    if (!registerForm || !pendingPolygon) return
    const res = await createProperty({
      geojson: pendingPolygon,
      name: registerForm.name,
      type: registerForm.type,
      price: registerForm.price ? parseFloat(registerForm.price) : null,
      owner: registerForm.owner || null,
    })
    if (res.success) {
      setRegisterForm(null)
      setPendingPolygon(null)
      await loadProperties()
    } else {
      alert(res.error || '登録に失敗しました')
    }
  }

  function cancelDraw() {
    setDrawMode(false)
    setVertices([])
    setRegisterForm(null)
    setPendingPolygon(null)
    if (map.current) {
      if (map.current.getLayer('draw-outline')) map.current.removeLayer('draw-outline')
      if (map.current.getSource('draw-preview')) map.current.removeSource('draw-preview')
    }
  }

  function onGeojson(geojson: object) {
    renderPolygons(geojson as { features: Array<unknown> })
  }

  return (
    <>
      <NavBar />
      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <h2 style={styles.title}>不動産物件管理</h2>
          <p style={styles.desc}>地図上でポリゴンを描いて物件エリアを登録。属性管理・AI検索ができます。</p>

          <div style={styles.section}>
            <div style={styles.label}>ポリゴン描画</div>
            {!drawMode ? (
              <button style={styles.drawBtn} onClick={() => { setVertices([]); setDrawMode(true) }}>
                ✏️ 描画開始
              </button>
            ) : (
              <div>
                <p style={styles.hint}>地図をクリックして頂点を追加、ダブルクリックで確定（{vertices.length}点）</p>
                <button style={styles.cancelBtn} onClick={cancelDraw}>キャンセル</button>
              </div>
            )}
          </div>

          <div style={styles.section}>
            <div style={styles.label}>種別凡例</div>
            {Object.entries(TYPE_COLOR).map(([k, color]) => (
              <div key={k} style={styles.legendRow}>
                <span style={{ width: 14, height: 14, background: color, opacity: 0.7, display: 'inline-block', borderRadius: 2 }} />
                {TYPE_LABEL[k]}
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.label}>物件一覧 ({properties.length}件)</div>
            <div style={styles.list}>
              {properties.map(p => (
                <div key={p.id} style={styles.listItem}>
                  <span style={{ ...styles.typeBadge, background: TYPE_COLOR[p.type] + '33', color: TYPE_COLOR[p.type] }}>
                    {TYPE_LABEL[p.type]}
                  </span>
                  <span style={styles.listName}>{p.name}</span>
                  {p.price && <span style={styles.listPrice}>{(p.price / 1e8).toFixed(1)}億</span>}
                </div>
              ))}
            </div>
          </div>

          {registerForm && (
            <div style={styles.form}>
              <div style={styles.formTitle}>物件登録</div>
              <input style={styles.input} placeholder="物件名 *" value={registerForm.name}
                onChange={e => setRegisterForm(f => f && ({ ...f, name: e.target.value }))} />
              <select style={styles.input} value={registerForm.type}
                onChange={e => setRegisterForm(f => f && ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input style={styles.input} placeholder="価格（円）" type="number" value={registerForm.price}
                onChange={e => setRegisterForm(f => f && ({ ...f, price: e.target.value }))} />
              <input style={styles.input} placeholder="オーナー名" value={registerForm.owner}
                onChange={e => setRegisterForm(f => f && ({ ...f, owner: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.regBtn} onClick={handleRegister} disabled={!registerForm.name}>登録</button>
                <button style={{ ...styles.cancelBtn, flex: 1 }} onClick={cancelDraw}>キャンセル</button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.mapWrap}>
          <div ref={mapContainer} style={styles.map} />
          <AiChat appContext="estate" mapBbox={bbox} onGeojson={onGeojson} />
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', height: '100vh', paddingTop: 48 },
  sidebar: {
    width: 260, background: '#1e293b', borderRight: '1px solid #334155',
    padding: 20, overflowY: 'auto', flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  desc: { color: '#64748b', fontSize: 12, lineHeight: 1.6, marginBottom: 20 },
  section: { marginBottom: 20 },
  label: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  hint: { color: '#38bdf8', fontSize: 12, lineHeight: 1.6, marginBottom: 8 },
  drawBtn: {
    width: '100%', background: '#2563eb', border: 'none', borderRadius: 6,
    color: '#fff', fontSize: 13, padding: '8px', cursor: 'pointer',
  },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  listItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  typeBadge: { fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 },
  listName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  listPrice: { color: '#64748b', fontSize: 11 },
  form: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
    padding: 14, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8,
  },
  formTitle: { fontWeight: 600, fontSize: 13, marginBottom: 4 },
  input: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
    color: '#f1f5f9', padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%',
  },
  regBtn: {
    flex: 1, background: '#2563eb', border: 'none', borderRadius: 6,
    color: '#fff', fontSize: 12, padding: '6px', cursor: 'pointer',
  },
  cancelBtn: {
    background: '#334155', border: 'none', borderRadius: 6,
    color: '#94a3b8', fontSize: 12, padding: '6px 10px', cursor: 'pointer',
  },
  mapWrap: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
}
