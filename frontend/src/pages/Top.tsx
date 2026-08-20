import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'

const APPS = [
  { to: '/infra', icon: '🔧', title: '設備管理マップ', desc: 'ガス管・電柱等の設備をGIS管理。点検ステータス・AIチャット' },
  { to: '/hazard', icon: '⚠️', title: '防災・避難所マップ', desc: 'ハザードゾーン・避難所をポリゴン・マーカーで可視化' },
  { to: '/road', icon: '🚗', title: '道路・交通マップ', desc: '道路区間ステータス・交通量ヒートマップ' },
  { to: '/estate', icon: '🏠', title: '不動産物件管理', desc: 'ポリゴン描画で物件登録・属性管理・AI検索' },
]

const STACK = [
  ['地図', 'MapLibre GL JS'],
  ['フロント', 'React + TypeScript + Vite'],
  ['バックエンド', 'FastAPI (Python)'],
  ['AI', 'Claude API (tool_use)'],
  ['DB', 'PostgreSQL + PostGIS'],
  ['インフラ', 'ConoHa VPS + Tailscale'],
]

export default function Top() {
  return (
    <>
      <NavBar />
      <div style={styles.wrap}>
        <div style={styles.hero}>
          <h1 style={styles.h1}>GIS × AI Agent Portfolio</h1>
          <p style={styles.sub}>
            GIS（地理情報システム）× AIエージェント × MCPアーキテクチャを組み合わせたWebマップシステム。<br />
            インフラ・公共系企業でのGIS活用を想定し、PM視点の設計から実装まで一貫して構築しました。
          </p>
          <div style={styles.badges}>
            <a href="https://github.com/livenara/gis-portfolio" target="_blank" rel="noopener" style={styles.badge}>
              GitHub
            </a>
          </div>
        </div>

        <div style={styles.grid}>
          {APPS.map(app => (
            <Link key={app.to} to={app.to} style={styles.card}>
              <div style={styles.cardIcon}>{app.icon}</div>
              <div style={styles.cardTitle}>{app.title}</div>
              <div style={styles.cardDesc}>{app.desc}</div>
            </Link>
          ))}
        </div>

        <div style={styles.section}>
          <h2 style={styles.h2}>技術スタック</h2>
          <div style={styles.stackGrid}>
            {STACK.map(([label, value]) => (
              <div key={label} style={styles.stackItem}>
                <span style={styles.stackLabel}>{label}</span>
                <span style={styles.stackValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.h2}>システムアーキテクチャ</h2>
          <div style={styles.arch}>
            <div style={styles.archStep}>Browser (React + MapLibre GL JS)</div>
            <div style={styles.arrow}>↓ HTTP / JSON</div>
            <div style={styles.archStep}>FastAPI + MCPハンドラー (ConoHa VPS)</div>
            <div style={styles.arrow}>↓ Claude API tool_use</div>
            <div style={styles.archStep}>claude-sonnet-4-6 (AIエージェント)</div>
            <div style={styles.arrow}>↓ ツール呼び出し</div>
            <div style={styles.archStep}>PostGIS (VM110 / Tailscale)</div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.h2}>AI活用の範囲</h2>
          <div style={styles.aiRow}>
            <div style={styles.aiBox}>
              <div style={styles.aiLabel}>AIが担った範囲</div>
              <ul style={styles.list}>
                <li>コード生成・リファクタリング提案</li>
                <li>設計ドキュメント生成</li>
                <li>テストケース生成</li>
              </ul>
            </div>
            <div style={styles.aiBox}>
              <div style={styles.aiLabel}>人間（PM）が担った範囲</div>
              <ul style={styles.list}>
                <li>要件定義・アーキテクチャ判断</li>
                <li>データ設計・UI/UXレビュー</li>
                <li>技術選定・品質確認</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 900, margin: '0 auto', padding: '72px 20px 60px' },
  hero: { textAlign: 'center', padding: '60px 0 40px' },
  h1: { fontSize: 36, fontWeight: 800, marginBottom: 16, color: '#f1f5f9' },
  sub: { color: '#94a3b8', fontSize: 15, lineHeight: 1.8, marginBottom: 20 },
  badges: { display: 'flex', justifyContent: 'center', gap: 10 },
  badge: {
    display: 'inline-block', background: '#1e293b', border: '1px solid #334155',
    borderRadius: 6, padding: '6px 16px', fontSize: 13, color: '#94a3b8',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, margin: '40px 0',
  },
  card: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
    padding: 24, transition: 'border-color 0.15s',
    cursor: 'pointer',
  },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontWeight: 700, fontSize: 16, marginBottom: 8 },
  cardDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6 },
  section: { margin: '48px 0' },
  h2: { fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#38bdf8' },
  stackGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  stackItem: {
    background: '#1e293b', borderRadius: 8, padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  stackLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  stackValue: { fontSize: 13, fontWeight: 600 },
  arch: {
    background: '#1e293b', borderRadius: 12, padding: 24,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  archStep: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
    padding: '10px 24px', fontSize: 13, fontWeight: 500,
  },
  arrow: { color: '#334155', fontSize: 20 },
  aiRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  aiBox: { background: '#1e293b', borderRadius: 10, padding: 20 },
  aiLabel: { fontWeight: 600, marginBottom: 12, color: '#38bdf8', fontSize: 14 },
  list: { paddingLeft: 20, color: '#94a3b8', fontSize: 13, lineHeight: 2 },
}
