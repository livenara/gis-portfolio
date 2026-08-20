import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import NavBar from '../components/NavBar'
import AiChat from '../components/AiChat'
import { fetchFacilities } from '../lib/api'

const STATUS_COLOR: Record<string, string> = {
  normal: '#22c55e',
  caution: '#f59e0b',
  repair: '#ef4444',
}

const STATUS_LABEL: Record<string, string> = {
  normal: '正常',
  caution: '要点検',
  repair: '要修理',
}

export default function Infra() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [bbox, setBbox] = useState<number[] | null>(null)
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)
  const [filter, setFilter] = useState<string>('')
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current) return
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [135.4955, 34.7021],
      zoom: 13,
    })
    map.current.addControl(new maplibregl.NavigationControl())
    map.current.on('moveend', updateBbox)
    map.current.on('load', () => { updateBbox(); loadFacilities() })
    return () => map.current?.remove()
  }, [])

  function updateBbox() {
    if (!map.current) return
    const b = map.current.getBounds()
    setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
  }

  async function loadFacilities(status?: string) {
    const params: Record<string, string> = {}
    if (status) params.status = status
    const data = await fetchFacilities(params)
    renderMarkers(data)
  }

  function renderMarkers(geojson: { features: Array<{ geometry: { coordinates: number[] }; properties: Record<string, unknown> }> }) {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (!map.current) return

    geojson.features?.forEach(f => {
      const [lng, lat] = f.geometry.coordinates
      const status = f.properties.status as string
      const el = document.createElement('div')
      el.style.cssText = `
        width:14px;height:14px;border-radius:50%;
        background:${STATUS_COLOR[status] || '#94a3b8'};
        border:2px solid rgba(255,255,255,0.8);
        cursor:pointer;
      `
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map.current!)
      el.addEventListener('click', () => setSelected(f.properties))
      markersRef.current.push(marker)
    })
  }

  function applyFilter(status: string) {
    setFilter(status)
    loadFacilities(status || undefined)
  }

  function onGeojson(geojson: object) {
    renderMarkers(geojson as { features: Array<{ geometry: { coordinates: number[] }; properties: Record<string, unknown> }> })
  }

  return (
    <>
      <NavBar />
      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <h2 style={styles.title}>設備管理マップ</h2>
          <p style={styles.desc}>ガス管・電柱・バルブ等の設備を地図上で管理。点検ステータスをフィルタできます。</p>

          <div style={styles.section}>
            <div style={styles.label}>ステータスフィルタ</div>
            <div style={styles.btnGroup}>
              {['', 'normal', 'caution', 'repair'].map(s => (
                <button key={s} style={{ ...styles.filterBtn, ...(filter === s ? styles.filterActive : {}) }}
                  onClick={() => applyFilter(s)}>
                  {s === '' ? '全て' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.label}>凡例</div>
            {Object.entries(STATUS_COLOR).map(([k, color]) => (
              <div key={k} style={styles.legendRow}>
                <span style={{ ...styles.dot, background: color }} />
                {STATUS_LABEL[k]}
              </div>
            ))}
          </div>

          {selected && (
            <div style={styles.panel}>
              <div style={styles.panelTitle}>{selected.name as string}</div>
              <div style={styles.panelRow}><span>種別</span><span>{selected.type as string}</span></div>
              <div style={styles.panelRow}>
                <span>ステータス</span>
                <span style={{ color: STATUS_COLOR[selected.status as string] }}>
                  {STATUS_LABEL[selected.status as string]}
                </span>
              </div>
              <div style={styles.panelRow}><span>点検日</span><span>{selected.inspected_at ? String(selected.inspected_at).slice(0, 10) : '未設定'}</span></div>
              <button style={styles.closeBtn} onClick={() => setSelected(null)}>閉じる</button>
            </div>
          )}
        </div>

        <div style={styles.mapWrap}>
          <div ref={mapContainer} style={styles.map} />
          <AiChat appContext="infra" mapBbox={bbox} onGeojson={onGeojson} />
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
  btnGroup: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  filterBtn: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 5,
    color: '#94a3b8', fontSize: 12, padding: '4px 10px', cursor: 'pointer',
  },
  filterActive: { background: '#2563eb', borderColor: '#2563eb', color: '#fff' },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
  panel: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
    padding: 14, marginTop: 20,
  },
  panelTitle: { fontWeight: 600, fontSize: 14, marginBottom: 10 },
  panelRow: {
    display: 'flex', justifyContent: 'space-between', fontSize: 12,
    color: '#94a3b8', marginBottom: 6,
  },
  closeBtn: {
    marginTop: 10, background: '#334155', border: 'none', borderRadius: 5,
    color: '#94a3b8', fontSize: 12, padding: '4px 10px', cursor: 'pointer', width: '100%',
  },
  mapWrap: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
}
