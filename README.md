# GIS × AI Agent Portfolio

**Live Demo**: https://gis.ekmdy.com

GIS（地理情報システム）× AIエージェント × MCPアーキテクチャを組み合わせたWebマップシステムのポートフォリオです。
インフラ・公共系企業でのGIS活用を想定し、PM視点の設計から実装まで一貫して構築しました。

## デモアプリ一覧

| アプリ | URL | 概要 |
|--------|-----|------|
| ポートフォリオTOP | `/` | プロフィール・技術スタック紹介 |
| 設備管理マップ | `/infra` | ガス管・電柱等の設備をGIS管理・点検ステータス管理 |
| 防災・避難所マップ | `/hazard` | ハザードゾーン・避難所の可視化 |
| 道路・交通マップ | `/road` | 道路区間ステータス・交通量ヒートマップ |
| 不動産物件管理 | `/estate` | ポリゴン描画による物件登録・属性管理 |

## システムアーキテクチャ

```
Browser (React + MapLibre GL JS)
    ↓ WebSocket
FastAPI + MCPハンドラー (VM / Python)
    ↓ Claude API tool_use
claude-sonnet-4-6 (AIエージェント)
    ↓ ツール呼び出し
PostGIS (PostgreSQL + 地理空間拡張)
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
| 開発支援AI | Claude Code (claude-sonnet-4-6) |

## 設計ドキュメント

- [要件定義](docs/01_requirements.md)
- [システムアーキテクチャ](docs/02_architecture.md)
- [ER図・DBスキーマ](docs/03_er-diagram.md)
- [MCPツール仕様書](docs/04_mcp-spec.md)
- [AIエージェント設計](docs/05_ai-workflow.md)
- [Claude Code開発ログ](docs/06_dev-log.md)

## AIを使った開発について

このプロジェクトはClaude Code（AIコーディングアシスタント）を活用して開発しています。

- **AIが担った範囲**: コード生成・設計ドキュメント生成・テストケース生成・リファクタリング提案
- **人間（PM）が担った範囲**: 要件定義・アーキテクチャ判断・データ設計・UI/UXレビュー・品質確認・技術選定

AIエージェント実装においては、[採用面接でよく聞かれるAI活用の10問](docs/05_ai-workflow.md)を設計仕様として取り込み、
Q1（モデルとコードの責任分離）・Q5（副作用操作の安全設計）・Q6（暴走防止）・Q7（障害時継続性）・Q8（ログ追跡）
それぞれに対応した実装を行っています。

## ローカル起動

```bash
# バックエンド
cd mcp-server
pip install -r requirements.txt
cp .env.example .env  # ANTHROPIC_API_KEY を設定
uvicorn main:app --reload

# フロントエンド
cd frontend
npm install
npm run dev
```

## ライセンス

MIT
