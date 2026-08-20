# MCPツール仕様書

## 設計方針

Claude API の `tool_use` 機能を使い、MCPスタイルのAIエージェントを実装する。
AIは自然言語をツール呼び出しに変換する責務のみを持ち、実際のデータ操作はPythonコードが担う。

## バジェット設計（Q6: 暴走防止）

```python
AGENT_BUDGET = {
    "max_tool_calls": 10,        # 最大ツール呼び出し回数
    "timeout_seconds": 30,       # 全体タイムアウト
    "loop_detection_threshold": 3,  # 同一ツール連続呼び出しでループ判定
    "max_tokens": 2000,          # レスポンストークン上限
}
```

## ツール一覧

### 読み取り系ツール

#### `get_facilities`
設備一覧を取得する。

```json
{
  "name": "get_facilities",
  "description": "地図上の設備を検索・取得する。エリア・種別・ステータスで絞り込み可能。",
  "input_schema": {
    "type": "object",
    "properties": {
      "bbox": {
        "type": "array",
        "items": {"type": "number"},
        "description": "[west, south, east, north] 緯度経度バウンディングボックス"
      },
      "type": {
        "type": "string",
        "enum": ["gas_pipe", "electric_pole", "valve", "sensor", "all"],
        "description": "設備種別"
      },
      "status": {
        "type": "string",
        "enum": ["normal", "caution", "repair", "all"],
        "description": "点検ステータス"
      }
    }
  }
}
```

#### `get_hazard_info`
ハザード情報・避難所を取得する。

```json
{
  "name": "get_hazard_info",
  "description": "指定地点周辺のハザードゾーンと避難所を取得する。",
  "input_schema": {
    "type": "object",
    "properties": {
      "lat": {"type": "number", "description": "緯度"},
      "lng": {"type": "number", "description": "経度"},
      "radius_m": {"type": "number", "description": "検索半径（メートル）", "default": 1000},
      "hazard_type": {
        "type": "string",
        "enum": ["flood", "landslide", "tsunami", "all"]
      }
    },
    "required": ["lat", "lng"]
  }
}
```

#### `get_road_status`
道路区間ステータスを取得する。

```json
{
  "name": "get_road_status",
  "description": "道路区間のステータス・交通量を取得する。",
  "input_schema": {
    "type": "object",
    "properties": {
      "bbox": {"type": "array", "items": {"type": "number"}},
      "status": {
        "type": "string",
        "enum": ["normal", "construction", "closed", "all"]
      }
    }
  }
}
```

#### `search_properties`
不動産物件を検索する。

```json
{
  "name": "search_properties",
  "description": "不動産物件をエリア・種別・価格帯で検索する。",
  "input_schema": {
    "type": "object",
    "properties": {
      "bbox": {"type": "array", "items": {"type": "number"}},
      "type": {
        "type": "string",
        "enum": ["residential", "commercial", "industrial", "land", "all"]
      },
      "price_min": {"type": "number"},
      "price_max": {"type": "number"},
      "status": {
        "type": "string",
        "enum": ["available", "sold", "leased", "all"]
      }
    }
  }
}
```

---

### 書き込み系ツール（副作用あり・Q5対応）

#### `update_facility_status`
設備ステータスを更新する。**確認トークンが必要。**

```json
{
  "name": "update_facility_status",
  "description": "設備の点検ステータスを更新する。この操作はDBを変更する。必ず確認トークンを要求すること。",
  "input_schema": {
    "type": "object",
    "properties": {
      "facility_id": {"type": "string", "format": "uuid"},
      "new_status": {
        "type": "string",
        "enum": ["normal", "caution", "repair"]
      },
      "confirm_token": {
        "type": "string",
        "description": "ユーザーから取得した確認トークン。未取得の場合は先にユーザーに確認を求めること。"
      },
      "idempotency_key": {
        "type": "string",
        "description": "重複実行防止キー（クライアントが生成するUUID）"
      }
    },
    "required": ["facility_id", "new_status", "confirm_token", "idempotency_key"]
  }
}
```

**副作用操作フロー（Q5）:**
```
1. ユーザーが「設備Aを要修理に変更して」と入力
2. AIが変更内容をユーザーに提示
3. ユーザーが確認ボタン押下 → confirm_token生成
4. AIがupdate_facility_statusを呼び出し（confirm_token付き）
5. サーバー側でidempotency_keyでの重複チェック
6. DB更新 → 成功通知
```

#### `register_property`
不動産物件を新規登録する（ポリゴン＋属性）。

```json
{
  "name": "register_property",
  "description": "不動産物件のポリゴンと属性を登録する。副作用操作のため確認が必要。",
  "input_schema": {
    "type": "object",
    "properties": {
      "geojson": {
        "type": "object",
        "description": "GeoJSON Polygon オブジェクト"
      },
      "attributes": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string", "enum": ["residential", "commercial", "industrial", "land"]},
          "area_sqm": {"type": "number"},
          "price": {"type": "number"},
          "owner": {"type": "string"},
          "status": {"type": "string", "enum": ["available", "sold", "leased"]}
        },
        "required": ["name", "type"]
      },
      "confirm_token": {"type": "string"},
      "idempotency_key": {"type": "string"}
    },
    "required": ["geojson", "attributes", "confirm_token", "idempotency_key"]
  }
}
```

---

## サーバー側バリデーション（コードが保証する範囲）

```python
# AIが返したジオメトリの検証（Q1: コード責任範囲）
def validate_geometry(geojson: dict) -> bool:
    geom = shape(geojson)
    if not geom.is_valid:
        raise ValueError("Invalid geometry")
    # 日本国内に限定（Bounding Box制限）
    JAPAN_BBOX = (122.93, 20.42, 153.99, 45.52)
    if not bounds_within(geom.bounds, JAPAN_BBOX):
        raise ValueError("Geometry outside Japan bounds")
    return True
```
