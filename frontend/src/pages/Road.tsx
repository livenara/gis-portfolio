import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import NavBar from '../components/NavBar'
import AiChat from '../components/AiChat'
import { fetchRoads } from '../lib/api'

const STATUS_COLOR: Record<string, string> = {
  normal: '#22c55e',
  construction: '#f59e0b',
  closed: '#ef4444',
}

const STATUS_LABEL: Record<string, string> = {
  normal: '正常',
  construction: '工事中',
  closed: '通行止め',
}

export default function Road() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [bbox, setBbox] = useState<number[] | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (!mapContainer.current) return
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [135.501, 34.703],
      zoom: 12,
    })
    map.current.addControl(new maplibregl.NavigationControl())
    map.current.on('moveend', updateBbox)
    map.current.on('load', () => { updateBbox(); loadRoads() })
    return () => map.current?.remove()
  }, [])

  function updateBbox() {
    if (!map.current) return
    const b = map.current.getBounds()
    setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
  }

  async function loadRoads(status?: string) {
    const params: Record<string, string> = {}
    if (status) params.status = status
    const data = await fetchRoads(params)
    renderRoads(data)
  }

  function renderRoads(geojson: { features: Array<unknown> }) {
    if (!map.current || !map.current.isStyleLoaded()) return
    if (map.current.getLayer('roads-layer')) map.current.removeLayer('roads-layer')
    if (map.current.getLayer('roads-heat')) map.current.removeLayer('roads-heat')
    if (map.current.getSource('roads')) map.current.removeSource('roads')

    map.current.addSource('roads', { type: 'geojson', data: geojson as GeoJSON.GeoJSON })

    // 道路区間
    map.current.addLayer({
      id: 'roads-layer',
      type: 'line',
      source: 'roads',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'match', ['get', 'status'],
          'normal', STATUS_COLOR.normal,
          'construction', STATUS_COLOR.construction,
          'closed', STATUS_COLOR.closed,
          '#94a3b8'
        ],
        'line-width': 4,
        'line-opacity': 0.85,
      },
    })

    // 交通量ヒートマップ（別レイヤーとして重ねる）
    map.current.addLayer({
      id: 'roads-heat',
      type: 'heatmap',
      source: 'roads',
      maxzoom: 15,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'traffic_volume'], 0, 0, 15000, 1],
        'heatmap-intensity': 0.6,
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,255,0)',
          0.3, 'rgba(0,255,255,0.5)',
          0.7, 'rgba(255,255,0,0.7)',
          1, 'rgba(255,0,0,0.9)'
        ],
        'heatmap-radius': 40,
        'heatmap-opacity': 0.4,
      },
    })
  }

  function applyFilter(status: string) {
    setFilter(status)
    loadRoads(status || undefined)
  }

  function onGeojson(geojson: object) {
    renderRoads(geojson as { features: Array<unknown> })
  }

  return (
    <>
      <NavBar />
      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <h2 style={styles.title}>道路・交通マップ</h2>
          <p style={styles.desc}>道路区間ステータスと交通量ヒートマップを表示します。</p>

          <div style={styles.section}>
            <div style={styles.label}>ステータスフィルタ</div>
            <div style={styles.btnGroup}>
              {['', 'normal', 'construction', 'closed'].map(s => (
                <button key={s}
                  style={{ ...styles.filterBtn, ...(filter === s ? styles.active : {}) }}
                  onClick={() => applyFilter(s)}>
                  {s === '' ? '全て' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.label}>道路ステータス凡例</div>
            {Object.entries(STATUS_COLOR).map(([k, color]) => (
              <div key={k} style={styles.legendRow}>
                <span style={{ width: 24, height: 4, background: color, display: 'inline-block', borderRadius: 2 }} />
                {STATUS_LABEL[k]}
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.label}>交通量ヒートマップ</div>
            <div style={styles.heatLegend}>
              <span style={styles.cool}>低</span>
              <div style={styles.heatBar} />
              <span style={styles.hot}>高</span>
            </div>
          </div>
        </div>

        <div style={styles.mapWrap}>
          <div ref={mapContainer} style={styles.map} />
          <AiChat appContext="road" mapBbox={bbox} onGeojson={onGeojson} />
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', height: '100vh', paddingTop: 48 },
  sidebar: {
    width: 240, background: '#1e293b', borderRight: '1px solid #334155',
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
  active: { background: '#2563eb', borderColor: '#2563eb', color: '#fff' },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 },
  heatLegend: { display: 'flex', alignItems: 'center', gap: 8 },
  cool: { color: '#60a5fa', fontSize: 12 },
  hot: { color: '#ef4444', fontSize: 12 },
  heatBar: {
    flex: 1, height: 8, borderRadius: 4,
    background: 'linear-gradient(to right, rgba(0,0,255,0.3), rgba(0,255,255,0.5), rgba(255,255,0,0.7), rgba(255,0,0,0.9))',
  },
  mapWrap: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
}
