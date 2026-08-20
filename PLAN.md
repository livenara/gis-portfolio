# GIS ポートフォリオ PLAN.md

## 目的 / ゴール

転職活動用ポートフォリオとして、GIS×AIエージェント×MCPを組み合わせたWebマップシステムを構築する。
PMとしてシステム設計を理解していること、AIエージェントの実装経験があることを採用担当に示す。

**ターゲット企業**: NTT西日本・JR西日本・関西電力G・KKCシステムズ・NTTデータ関西等のGIS使う側企業

**GitHub公開URL**: https://github.com/[未定]/gis-portfolio
**公開URL**: https://gis.ekmdy.com

---

## ロードマップ

| フェーズ | 内容 | 状態 |
|---------|------|------|
| 1. 要件定義 | 4アプリの機能要件・MCP設計 | ✅ 完了（2026-08-20） |
| 2. 設計 | アーキテクチャ・ER図・API仕様・MCPツール仕様 | 🔄 進行中 |
| 3. インフラ構築 | VM108 PostGIS + FastAPI + Nginx | ⬜ 未着手 |
| 4. MCP Server実装 | GISツール定義・Claude API連携 | ⬜ 未着手 |
| 5. フロントエンド実装 | React + MapLibre GL JS（4アプリ） | ⬜ 未着手 |
| 6. データ投入 | サンプルデータ・GeoJSON整備 | ⬜ 未着手 |
| 7. ドキュメント整備 | GitHub docs/ + dev-log | ⬜ 未着手 |
| 8. デプロイ | gis.ekmdy.com DNS設定・本番公開 | ⬜ 未着手 |

---

## 現在の状態

2026-08-20：要件定義完了。設計ドキュメント作成中。

---

## 決定事項

| 日付 | 決定内容 |
|------|---------|
| 2026-08-20 | サブドメイン: gis.ekmdy.com |
| 2026-08-20 | フロントエンド: React + MapLibre GL JS |
| 2026-08-20 | バックエンド: FastAPI (Python) on VM108 |
| 2026-08-20 | DB: PostGIS (PostgreSQL) on VM108 |
| 2026-08-20 | AI: Claude API (claude-sonnet-4-6) + MCPスタイル設計 |
| 2026-08-20 | ホスト: フロント=ロリポップ or Nginx/VM108、API=VM108 |
| 2026-08-20 | 4アプリ構成: /infra /hazard /road /estate |
| 2026-08-20 | 面接対策10問（@voidwarriorchan）をポートフォリオ設計に組み込む |

---

## アプリ構成

### トップページ（gis.ekmdy.com/）
- ポートフォリオ紹介ページ（React）
- 4デモへのカード型リンク
- 使用技術・GitHubリンク・AI活用の説明

### 1. インフラ設備管理マップ（/infra）
- 設備アイコン（ガス管・電柱・バルブ等）を地図上にプロット
- 点検ステータス管理（正常/要注意/要修理）
- 設備詳細パネル（属性表示・更新）
- AIチャット: 「梅田周辺の要点検設備を表示して」

### 2. 防災・避難所マップ（/hazard）
- 避難所・公共施設をマーカー表示（e-Stat/国土地理院オープンデータ）
- ハザードゾーン（洪水・土砂）をポリゴン表示
- 最寄り避難所ルート案内
- AIチャット: 「現在地から半径1km以内の避難所は？」

### 3. 道路・交通マップ（/road）
- 道路区間ごとのステータス表示（正常/工事中/通行止め）
- 交通量ヒートマップ
- 道路点検記録の登録
- AIチャット: 「通行止め区間を全て表示して」

### 4. 不動産物件管理マップ（/estate）
- **ポリゴン描画で物件エリアを登録**（MapLibre Draw使用）
- 物件属性登録（名称・種別・面積・価格・オーナー・ステータス）
- 物件一覧テーブルと地図の連動
- AIチャット: 「梅田エリアの商業物件を表示して」
- 副作用操作の安全設計（Q5対応）: 更新時の確認フロー

---

## MCPアーキテクチャ

```
Browser (React)
    ↓ fetch/WebSocket
FastAPI + MCP Handler (VM108)
    ↓ Claude API tool_use
Claude claude-sonnet-4-6
    ↓ tool呼び出し
MCP Tools (Python)
    ├── get_facilities(area, type, status)
    ├── get_hazard_info(lat, lng, radius)
    ├── get_road_status(segment_id, area)
    ├── search_properties(area, type, price_range)
    ├── update_facility_status(id, status)  ← 副作用あり・確認必須
    └── register_property(geojson, attributes) ← 副作用あり・確認必須
    ↓ PostGIS query
PostgreSQL + PostGIS (VM108)
```

### 面接Q対応設計
| Q | 対応実装 |
|---|---------|
| Q1 モデル責任分離 | AI=自然言語→ツール選択のみ。空間クエリ・検証はPostGIS/コード側 |
| Q3 品質低下検知 | テストケース集（期待クエリ→期待GeoJSON）をdocs/に保存 |
| Q5 副作用操作 | update/register系ツールに確認トークン・冪等キー実装 |
| Q6 暴走停止 | max_tool_calls=10、timeout=30s、同一ツール連続3回でループ判定 |
| Q7 モデル障害 | AIチャット機能とマップ表示を完全分離。AI停止時も地図は動作 |
| Q8 失敗追跡 | request_id付きロギング全エンドポイントに実装 |

---

## ファイル構成

```
300_gis-portfolio/
├── PLAN.md（本ファイル）
├── docs/
│   ├── 01_requirements.md     要件定義
│   ├── 02_architecture.md     システム構成図（Mermaid）
│   ├── 03_er-diagram.md       ER図・PostGISスキーマ
│   ├── 04_mcp-spec.md         MCPツール仕様書
│   ├── 05_ai-workflow.md      AIエージェント設計・プロンプト
│   └── 06_dev-log.md          Claude Code開発記録
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── Top.tsx
│       │   ├── Infra.tsx
│       │   ├── Hazard.tsx
│       │   ├── Road.tsx
│       │   └── Estate.tsx
│       ├── components/
│       │   ├── MapBase.tsx
│       │   ├── AiChat.tsx
│       │   └── AttributePanel.tsx
│       └── lib/
│           └── mcpClient.ts
├── mcp-server/
│   ├── main.py               FastAPIエントリポイント
│   ├── mcp_handler.py        MCPメッセージ処理
│   ├── tools/
│   │   ├── infra_tools.py
│   │   ├── hazard_tools.py
│   │   ├── road_tools.py
│   │   └── estate_tools.py
│   ├── db.py                 PostGIS接続
│   ├── claude_agent.py       Claude API呼び出し
│   ├── logger.py             request_idロギング
│   └── .env.example
└── db/
    ├── schema.sql            PostGISスキーマ定義
    └── seed_data.sql         サンプルデータ
```

---

## 案件再開に必要な情報

### VM108接続
- 接続情報: `020_INFRA.md` 参照
- PostGIS: port 5432、DB名: `gis_portfolio`
- FastAPI起動: `uvicorn mcp-server.main:app --host 0.0.0.0 --port 8080`

### DNS設定
- `gis.ekmdy.com` → VM108 IPアドレス（ロリポップDNSで設定）

### 環境変数（.envに保存）
- `ANTHROPIC_API_KEY` - Claude API
- `DATABASE_URL` - PostGIS接続文字列

### GitHub
- リポジトリ: 未作成（livenara アカウントで作成予定）
- `gh auth token` でOAuthトークン取得済み

---

## TODO

- [ ] docs/01〜06 設計ドキュメント作成
- [ ] GitHubリポジトリ作成
- [ ] VM108にPostGIS + FastAPIセットアップ
- [ ] db/schema.sql 作成
- [ ] mcp-server 実装
- [ ] frontend React実装（4アプリ）
- [ ] gis.ekmdy.com DNS設定
- [ ] dev-log.md にClaude Code開発記録を随時追記
