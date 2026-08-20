import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import NavBar from '../components/NavBar'
import AiChat from '../components/AiChat'
import { fetchHazard } from '../lib/api'

const HAZARD_COLOR: Record<string, string> = {
  flood: '#3b82f6',
  landslide: '#f97316',
  tsunami: '#8b5cf6',
}

const HAZARD_LABEL: Record<string, string> = {
  flood: '洪水',
  landslide: '土砂',
  tsunami: '津波',
}

export default function Hazard() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [bbox, setBbox] = useState<number[] | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current) return
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [135.4955, 34.72],
      zoom: 11,
    })
    map.current.addControl(new maplibregl.NavigationControl())
    map.current.on('moveend', updateBbox)
    map.current.on('load', () => { updateBbox(); loadHazard() })
    return () => map.current?.remove()
  }, [])

  function updateBbox() {
    if (!map.current) return
    const b = map.current.getBounds()
    setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
  }

  async function loadHazard() {
    const data = await fetchHazard()
    renderLayers(data)
  }

  function renderLayers(geojson: { features: Array<{ geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> }> }) {
    if (!map.current || !map.current.isStyleLoaded()) return

    // 既存レイヤー除去
    ['hazard-fill', 'hazard-outline', 'shelter-layer'].forEach(id => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id)
    })
    if (map.current!.getSource('hazard')) map.current!.removeSource('hazard')

    // ハザードと避難所を分離
    const zones = { type: 'FeatureCollection', features: geojson.features?.filter(f => f.properties.layer === 'hazard_zone') }
    const shelters = { type: 'FeatureCollection', features: geojson.features?.filter(f => f.properties.layer === 'shelter') }

    // ハザードゾーン（ポリゴン）
    map.current.addSource('hazard', { type: 'geojson', data: zones as GeoJSON.GeoJSON })
    map.current.addLayer({
      id: 'hazard-fill',
      type: 'fill',
      source: 'hazard',
      paint: {
        'fill-color': [
          'match', ['get', 'hazard_type'],
          'flood', HAZARD_COLOR.flood,
          'landslide', HAZARD_COLOR.landslide,
          'tsunami', HAZARD_COLOR.tsunami,
          '#94a3b8'
        ],
        'fill-opacity': 0.4,
      },
    })
    map.current.addLayer({
      id: 'hazard-outline',
      type: 'line',
      source: 'hazard',
      paint: { 'line-color': '#334155', 'line-width': 1 },
    })

    // 避難所マーカー
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    shelters.features?.forEach(f => {
      const coords = f.geometry.coordinates as number[]
      const el = document.createElement('div')
      el.style.cssText = `
        width:18px;height:18px;border-radius:4px;
        background:#22c55e;border:2px solid white;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;cursor:pointer;
      `
      el.textContent = '🏥'
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coords[0], coords[1]])
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(
          `<div style="font-size:13px"><b>${f.properties.name}</b><br>収容人数: ${f.properties.capacity || '不明'}人</div>`
        ))
        .addTo(map.current!)
      markersRef.current.push(marker)
    })
  }

  function onGeojson(geojson: object) {
    renderLayers(geojson as { features: Array<{ geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> }> })
  }

  return (
    <>
      <NavBar />
      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <h2 style={styles.title}>防災・避難所マップ</h2>
          <p style={styles.desc}>ハザードゾーンと避難所を地図上で可視化します。</p>

          <div style={styles.section}>
            <div style={styles.label}>ハザードゾーン凡例</div>
            {Object.entries(HAZARD_COLOR).map(([k, color]) => (
              <div key={k} style={styles.legendRow}>
                <span style={{ ...styles.dot, background: color, borderRadius: 3, opacity: 0.7 }} />
                {HAZARD_LABEL[k]}
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.label}>マーカー</div>
            <div style={styles.legendRow}>
              <span>🏥</span> 避難所（クリックで詳細）
            </div>
          </div>
        </div>

        <div style={styles.mapWrap}>
          <div ref={mapContainer} style={styles.map} />
          <AiChat appContext="hazard" mapBbox={bbox} onGeojson={onGeojson} />
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
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 },
  dot: { width: 14, height: 14, display: 'inline-block' },
  mapWrap: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
}
