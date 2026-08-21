import NavBar from '../components/NavBar'

const sections = [
  {
    title: 'システムアーキテクチャ',
    content: null,
    diagram: `
ブラウザ (React + Leaflet)
       │ HTTPS
       ▼
  Nginx (ConoHa VPS)
  ├── / ──────────────→ React静的ファイル配信
  └── /api/ ──────────→ FastAPI (uvicorn :8102)
                              │
               ┌──────────────┼──────────────┐
               │              │              │
          Claude API      PostGIS DB    Pydantic
         (tool_use)      (VM110:5433)  バリデーション
               │              │
          AIエージェント   空間クエリ
          最大10ターン     ST_Within
          ループ検知       ST_AsGeoJSON
    `,
  },
  {
    title: 'フロントエンド',
    content: null,
    items: [
      { label: 'React 18 + TypeScript + Vite', desc: 'SPA構成。型安全なコンポーネント設計' },
      { label: 'Leaflet 1.9 + OpenStreetMap', desc: 'オープンソースのWebGIS。ポリゴン描画・マーカー・GeoJSONレンダリングに対応' },
      { label: 'React Router v6', desc: '5画面のSPAルーティング（/infra, /hazard, /road, /estate, /tech）' },
      { label: 'ネイティブポリゴン描画', desc: 'Leafletのclick/dblclickイベントで頂点収集、ダブルクリックでGeoJSON確定・登録' },
      { label: 'AIチャット UI', desc: 'map_bbox（現在の地図範囲）をリクエストに付与し、表示中エリアに絞った回答を実現' },
    ],
  },
  {
    title: 'バックエンド（FastAPI）',
    content: null,
    items: [
      { label: 'FastAPI + uvicorn', desc: 'Python製の非同期Webフレームワーク。型アノテーションで自動バリデーション' },
      { label: 'Pydanticバリデーション', desc: 'message（500字以内）・app_context（enum）・map_bbox（緯度経度範囲）を入力検証' },
      { label: 'レート制限', desc: 'IPごとに10回/分をインメモリ管理（threading.Lock）。分散環境ではRedisに移行可能' },
      { label: 'CORS制限', desc: '許可originを環境変数ALLOWED_ORIGINSで管理。本番はgis.ekmdy.comのみ' },
      { label: 'ヘルスチェック', desc: 'GET /api/health でサービス稼働を確認（監視・デプロイ確認用）' },
    ],
  },
  {
    title: 'AIエージェント（Claude tool_use）',
    content: null,
    items: [
      { label: 'Claude claude-sonnet-4-6 API', desc: 'Anthropic社のLLM。tool_useモードで関数呼び出しを制御' },
      { label: 'コンテキスト別ツールスコープ', desc: '設備管理・防災・道路・不動産の4コンテキストで使用可能ツールを制限。過剰な操作を防止' },
      { label: 'ループ検知', desc: '同一ツール呼び出しが3回連続した場合に強制終了。無限ループを防ぐ' },
      { label: '最大10ターン制限', desc: '1リクエストあたりのツール呼び出し上限でタイムアウトリスクを排除' },
      { label: 'GeoJSON応答', desc: 'AIがgeojsonキーでFeatureCollectionを返すとフロントが地図に自動反映' },
    ],
  },
  {
    title: 'データベース（PostGIS）',
    content: null,
    items: [
      { label: 'PostgreSQL + PostGIS', desc: '空間データ対応のRDB。POINT/LINESTRING/POLYGONをWGS84(SRID:4326)で管理' },
      { label: 'GISTインデックス', desc: '空間検索にGISTインデックスを適用。矩形検索(ST_Within)を高速化' },
      { label: 'ST_Within + ST_MakeEnvelope', desc: '地図表示範囲（bbox）に収まるデータのみを返す空間フィルタリング' },
      { label: 'ST_AsGeoJSON', desc: 'DBサーバー側でGeoJSON変換。アプリ層の変換コストをゼロに' },
      { label: '6テーブル構成', desc: 'facilities(設備)・hazard_zones(ハザード)・shelters(避難所)・road_segments(道路)・properties(物件)・operation_logs' },
    ],
  },
  {
    title: 'インフラ・セキュリティ',
    content: null,
    items: [
      { label: 'ConoHa VPS + Nginx', desc: '静的ファイル配信とAPIリバースプロキシを1台で担当。Let\'s Encrypt でSSL/TLS化' },
      { label: 'Tailscale VPN', desc: 'ConoHa→VM110のPostGIS接続をTailscaleで暗号化。DBをインターネット非公開に維持' },
      { label: '環境変数による秘密管理', desc: 'DB接続文字列・APIキーはsystemdのEnvironmentFileで注入。コードに認証情報を持たない' },
      { label: 'APIドキュメント非公開', desc: 'FastAPIのdocs_url/redoc_urlをNoneに設定。本番環境でのエンドポイント探索を防止' },
      { label: 'git履歴の機密情報排除', desc: 'git-filter-repoで過去コミットの認証情報を無効化。パスワードローテーションと組み合わせて対処' },
    ],
  },
]

export default function Tech() {
  return (
    <>
      <NavBar />
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.heading}>技術解説</h1>
          <p style={styles.lead}>
            このポートフォリオの設計・実装における技術的な判断と構成を解説します。
          </p>

          {sections.map((sec) => (
            <section key={sec.title} style={styles.section}>
              <h2 style={styles.sectionTitle}>{sec.title}</h2>

              {sec.diagram && (
                <pre style={styles.diagram}>{sec.diagram}</pre>
              )}

              {sec.items && (
                <div style={styles.itemList}>
                  {sec.items.map((item) => (
                    <div key={item.label} style={styles.item}>
                      <div style={styles.itemLabel}>{item.label}</div>
                      <div style={styles.itemDesc}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>テスト戦略</h2>
            <div style={styles.itemList}>
              <div style={styles.item}>
                <div style={styles.itemLabel}>バックエンド（pytest）</div>
                <div style={styles.itemDesc}>
                  入力バリデーション・レート制限ロジック・ツールスコープ分岐・DB接続エラー処理をユニットテストでカバー
                </div>
              </div>
              <div style={styles.item}>
                <div style={styles.itemLabel}>フロントエンド（Vitest + Testing Library）</div>
                <div style={styles.itemDesc}>
                  AiChatコンポーネントのメッセージ送受信・エラーハンドリング・GeoJSON反映コールバックをテスト
                </div>
              </div>
            </div>
          </section>

          <section style={{ ...styles.section, borderBottom: 'none' }}>
            <h2 style={styles.sectionTitle}>今後の拡張候補</h2>
            <div style={styles.itemList}>
              {[
                { label: 'WebSocket対応', desc: '地図更新をリアルタイムでプッシュ通知（設備異常・道路閉鎖の即時反映）' },
                { label: 'Redis レート制限', desc: '複数インスタンス対応。現在のインメモリ実装からRedis backed管理に移行' },
                { label: 'MapTiler Vector Tiles', desc: 'ラスタータイルからベクタータイルへ移行し、より滑らかなズームとスタイリングを実現' },
                { label: 'GTFS対応（公共交通）', desc: '交通機関ルートデータを取り込み、避難経路最適化に活用' },
              ].map((item) => (
                <div key={item.label} style={styles.item}>
                  <div style={styles.itemLabel}>{item.label}</div>
                  <div style={styles.itemDesc}>{item.desc}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f172a', paddingTop: 48, color: '#f1f5f9' },
  container: { maxWidth: 860, margin: '0 auto', padding: '40px 24px' },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 12 },
  lead: { color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 48 },
  section: {
    borderBottom: '1px solid #1e293b', paddingBottom: 36, marginBottom: 36,
  },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: '#38bdf8', marginBottom: 20 },
  diagram: {
    background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8,
    padding: '20px 24px', fontSize: 13, lineHeight: 1.7, color: '#93c5fd',
    overflowX: 'auto', whiteSpace: 'pre', fontFamily: "'Fira Code', 'Consolas', monospace",
  },
  itemList: { display: 'flex', flexDirection: 'column', gap: 14 },
  item: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
    padding: '14px 18px',
  },
  itemLabel: { fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#e2e8f0' },
  itemDesc: { fontSize: 13, color: '#94a3b8', lineHeight: 1.6 },
}
