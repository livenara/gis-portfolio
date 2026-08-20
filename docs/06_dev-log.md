# 開発ログ（Claude Code使用記録）

このファイルはClaude Codeとの協働開発の記録です。採用担当者へのAIエージェント活用の証跡として公開します。

---

## 2026-08-20 セッション1：要件定義・設計

### 使用AI
- Claude Code (claude-sonnet-4-6) via Claude Code CLI

### やったこと
1. 転職活動の軸整理（GIS使う側・営業お守りからの脱却）
2. リクナビNEXT・マイナビ・レバテックをSeleniumで自動スクレイピング
3. ポートフォリオ構成の設計（4アプリ + MCP構成）
4. @voidwarriorchan の面接10問をポートフォリオ設計に組み込む方針決定
5. 設計ドキュメント（02〜05）の生成

### Claudeが生成したもの
- `docs/02_architecture.md` (Mermaidシステム構成図含む)
- `docs/03_er-diagram.md` (PostGISスキーマSQL含む)
- `docs/04_mcp-spec.md` (MCPツール仕様・JSON Schema)
- `docs/05_ai-workflow.md` (エージェントシーケンス図含む)
- `PLAN.md` (プロジェクト全体管理)

### PMが判断したこと（人間の責任範囲）
- 4アプリ構成にする決定（infra/hazard/road/estate）
- 不動産マップにポリゴン描画機能を追加する要件
- サブドメイン gis.ekmdy.com の選定
- MCP＋FastAPI構成の採用（単純なREST APIではなく）
- 面接10問をポートフォリオ設計の仕様として活用する判断

### 気づき・ハマりポイント
- リクナビはJavaScriptレンダリングのためWebFetchでは取得不可 → SeleniumでCSS class `bigCard` を特定して解決
- レバテックはログイン必須でスクレイピング困難 → 直接サイト検索を推奨

---

## TODO（次セッション）

- [ ] GitHubリポジトリ作成・初回push
- [ ] VM108にPostGIS環境構築
- [ ] `db/schema.sql` 実行・サンプルデータ投入
- [ ] `mcp-server/main.py` 実装開始
- [ ] React プロジェクト初期化（Vite + TypeScript）
