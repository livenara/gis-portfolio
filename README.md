# GIS × AI Agent Portfolio

**公開URL**: https://gis.ekmdy.com

GIS（地理情報システム）とAIエージェント・MCPアーキテクチャを組み合わせたWebマップシステムのポートフォリオです。
インフラ・公共系企業におけるGIS活用を想定し、PM視点の要件定義・システム設計から実装・デプロイまで一貫して構築しました。

## デモアプリ一覧

| アプリ | URL | 概要 |
|--------|-----|------|
| ポートフォリオTOP | `/` | プロフィール・技術スタック・設計思想の紹介 |
| 設備管理マップ | `/infra` | ガス管・電柱等の設備をGIS管理。点検ステータス管理・AIチャット |
| 防災・避難所マップ | `/hazard` | ハザードゾーン・避難所の可視化。洪水・土砂リスクのポリゴン表示 |
| 道路・交通マップ | `/road` | 道路区間ステータス・交通量ヒートマップ |
| 不動産物件管理 | `/estate` | ポリゴン描画による物件登録・属性管理・AI検索 |

## システムアーキテクチャ

```
Browser (React + MapLibre GL JS)
    ↓ HTTP / JSON
Nginx リバースプロキシ (ConoHa VPS)
    ├── /        → React 静的ファイル
    └── /api/    → FastAPI (Python)
                      ↓ Claude API tool_use
                  claude-sonnet-4-6
                      ↓ MCPツール呼び出し
                  PostGIS (PostgreSQL + 地理空間拡張 / VM110)
```

AIはユーザーの自然言語をMCPツール呼び出しに変換する責務のみを担い、
空間クエリの正確性・副作用操作の安全性・障害時の継続性はコード側で保証しています。

## 技術スタック

| 層 | 技術 |
|----|------|
| 地図 | MapLibre GL JS |
| フロントエンド | React + TypeScript + Vite |
| バックエンド | FastAPI (Python) |
| AI | Claude API (claude-sonnet-4-6) tool_use |
| データベース | PostgreSQL + PostGIS |
| インフラ | ConoHa VPS + Tailscale + systemd |

## AIエージェント設計方針

本システムのAIエージェントは、採用面接においてよく問われる設計観点を仕様として取り込んでいます。

| 観点 | 実装内容 |
|------|---------|
| モデル・コード責任分離 | AIは自然言語→ツール選択のみ担当。空間クエリ・検証・副作用処理はコード側で実装 |
| 副作用操作の安全設計 | update / register 系ツールに confirm_token 機構を実装。ユーザー確認なし実行を防止 |
| 暴走防止 | max_tool_calls=10、timeout=30s、同一ツール3回連続でループ検知・停止 |
| 障害時継続性 | AIチャット機能とマップ表示を完全分離。AI停止時も地図・データ閲覧は継続 |
| 失敗追跡 | request_id 付きロギングを全エンドポイントに実装。`operation_logs` テーブルに記録 |

## 設計ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [要件定義](docs/01_requirements.md) | ユーザーストーリー・機能要件・非機能要件 |
| [システムアーキテクチャ](docs/02_architecture.md) | Mermaidによる構成図・責任分離設計 |
| [ER図・DBスキーマ](docs/03_er-diagram.md) | PostGISテーブル定義・GIST索引設計 |
| [MCPツール仕様書](docs/04_mcp-spec.md) | ツール定義・JSON Schema・安全設計 |
| [AIエージェント設計](docs/05_ai-workflow.md) | シーケンス図・システムプロンプト・コスト追跡 |
| [Claude Code開発ログ](docs/06_dev-log.md) | AI活用の証跡・PM判断の記録 |

## AIを活用した開発について

本プロジェクトはClaude Code（AIコーディングアシスタント）を活用して開発しました。

| 担当 | 範囲 |
|------|------|
| Claude Code | コード生成・設計ドキュメント生成・テストケース生成・リファクタリング提案 |
| 人間（PM） | 要件定義・アーキテクチャ判断・データ設計・UI/UXレビュー・技術選定・品質確認 |

AI生成コードをそのまま採用するのではなく、PMとして設計意図・安全性・保守性を精査したうえで採用・修正しています。
開発ログの詳細は [docs/06_dev-log.md](docs/06_dev-log.md) を参照してください。

## ローカル起動

```bash
# バックエンド
cd mcp-server
pip install -r requirements.txt
cp .env.example .env  # ANTHROPIC_API_KEY・DATABASE_URL を設定
uvicorn main:app --reload --port 8102

# フロントエンド（別ターミナル）
cd frontend
npm install
npm run dev
```

## ライセンス

MIT
