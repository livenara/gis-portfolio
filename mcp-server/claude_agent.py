import os
import time
import anthropic
from logger import log_operation, Timer
from tools.infra_tools import get_facilities, update_facility_status
from tools.hazard_tools import get_hazard_info
from tools.road_tools import get_road_status
from tools.estate_tools import search_properties, register_property

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MAX_TOOL_CALLS = 10
LOOP_THRESHOLD = 3  # 同一ツール連続でループ判定
TIMEOUT_SECONDS = 30

TOOL_DEFINITIONS = [
    {
        "name": "get_facilities",
        "description": "設備（ガス管・電柱・バルブ等）を地図範囲またはステータスで検索します",
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "[minLng, minLat, maxLng, maxLat]"
                },
                "status": {"type": "string", "enum": ["normal", "caution", "repair"]},
                "type": {"type": "string", "description": "設備種別 (gas_pipe/electric_pole/valve/transformer)"}
            }
        }
    },
    {
        "name": "get_hazard_info",
        "description": "ハザードゾーン（洪水・土砂）と避難所を検索します",
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {"type": "array", "items": {"type": "number"}},
                "hazard_type": {"type": "string", "enum": ["flood", "landslide", "tsunami"]},
                "include_shelters": {"type": "boolean"}
            }
        }
    },
    {
        "name": "get_road_status",
        "description": "道路区間のステータス・交通量を検索します",
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {"type": "array", "items": {"type": "number"}},
                "status": {"type": "string", "enum": ["normal", "construction", "closed"]}
            }
        }
    },
    {
        "name": "search_properties",
        "description": "不動産物件をエリア・種別・価格帯で検索します",
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {"type": "array", "items": {"type": "number"}},
                "type": {"type": "string", "enum": ["residential", "commercial", "industrial", "land"]},
                "max_price": {"type": "number"}
            }
        }
    },
    {
        "name": "update_facility_status",
        "description": "設備のステータスを更新します。副作用あり。confirm_token='CONFIRMED'が必要です。",
        "input_schema": {
            "type": "object",
            "properties": {
                "facility_id": {"type": "string"},
                "new_status": {"type": "string", "enum": ["normal", "caution", "repair"]},
                "confirm_token": {"type": "string"}
            },
            "required": ["facility_id", "new_status", "confirm_token"]
        }
    },
    {
        "name": "register_property",
        "description": "新規不動産物件をポリゴンで登録します。副作用あり。confirm_token='CONFIRMED'が必要です。",
        "input_schema": {
            "type": "object",
            "properties": {
                "geojson": {"type": "object"},
                "name": {"type": "string"},
                "type": {"type": "string", "enum": ["residential", "commercial", "industrial", "land"]},
                "price": {"type": "number"},
                "owner": {"type": "string"},
                "confirm_token": {"type": "string"}
            },
            "required": ["geojson", "name", "type", "confirm_token"]
        }
    }
]

SYSTEM_PROMPT = """あなたはGIS地図システムのAIアシスタントです。
ユーザーの自然言語クエリを解釈し、適切なGISツールを呼び出して地図情報を取得・操作します。

## 重要なルール
1. 地図データの取得・検索は必ずツールを使うこと（知識から答えを作らない）
2. DBを変更する操作（update/register系）は必ずconfirm_tokenに'CONFIRMED'を使うが、ユーザーが「確認した」「やって」と言った時のみ
3. 座標や範囲の指定が不明な場合は、現在の地図表示範囲（map_bbox）を使うこと
4. ツール呼び出しは最大{max_calls}回まで
5. 回答は日本語で、簡潔に（3文以内）

## 現在の地図表示範囲
{map_bbox}

## アプリコンテキスト
{app_context}
"""

APP_CONTEXT_LABELS = {
    "infra": "設備管理マップ（ガス管・電柱・バルブ等の設備点検）",
    "hazard": "防災・避難所マップ（ハザードゾーン・避難所）",
    "road": "道路・交通マップ（道路ステータス・交通量）",
    "estate": "不動産物件管理マップ（ポリゴン物件登録・管理）",
}

CONTEXT_TOOLS = {
    "infra": ["get_facilities", "update_facility_status"],
    "hazard": ["get_hazard_info"],
    "road": ["get_road_status"],
    "estate": ["search_properties", "register_property"],
}


def dispatch_tool(name: str, inputs: dict) -> dict:
    if name == "get_facilities":
        return get_facilities(**inputs)
    elif name == "get_hazard_info":
        return get_hazard_info(**inputs)
    elif name == "get_road_status":
        return get_road_status(**inputs)
    elif name == "search_properties":
        return search_properties(**inputs)
    elif name == "update_facility_status":
        return update_facility_status(**inputs)
    elif name == "register_property":
        return register_property(**inputs)
    else:
        return {"error": f"未知のツール: {name}"}


def run_agent(message: str, app_context: str, map_bbox: list | None, request_id: str) -> dict:
    """
    Claude API tool_use ループ。
    - max 10 tool calls
    - 同一ツール 3連続でループ検知・停止
    - タイムアウト 30秒
    返り値: {"reply": str, "geojson": dict | None}
    """
    allowed_tools = CONTEXT_TOOLS.get(app_context, [])
    tools = [t for t in TOOL_DEFINITIONS if t["name"] in allowed_tools]

    bbox_str = str(map_bbox) if map_bbox else "未指定"
    system = SYSTEM_PROMPT.format(
        max_calls=MAX_TOOL_CALLS,
        map_bbox=bbox_str,
        app_context=APP_CONTEXT_LABELS.get(app_context, app_context),
    )

    messages = [{"role": "user", "content": message}]
    tool_call_count = 0
    last_tool = None
    consecutive_same = 0
    final_geojson = None
    start = time.time()

    while True:
        if time.time() - start > TIMEOUT_SECONDS:
            return {"reply": "処理がタイムアウトしました。もう一度お試しください。", "geojson": None}

        timer = Timer()
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            tools=tools,
            messages=messages,
        )
        elapsed = timer.elapsed_ms()

        log_operation(
            request_id=request_id,
            tool_name="claude_api",
            input_params={"message": message, "app_context": app_context, "turn": tool_call_count},
            result_summary={"stop_reason": response.stop_reason, "tokens": response.usage.output_tokens},
            is_success=True,
            duration_ms=elapsed,
        )

        if response.stop_reason == "end_turn":
            text = next((b.text for b in response.content if hasattr(b, "text")), "")
            return {"reply": text, "geojson": final_geojson}

        if response.stop_reason != "tool_use":
            return {"reply": "予期しない応答が返りました。", "geojson": None}

        # tool_use ブロック処理
        tool_results = []
        messages.append({"role": "assistant", "content": response.content})

        for block in response.content:
            if block.type != "tool_use":
                continue

            tool_call_count += 1
            if tool_call_count > MAX_TOOL_CALLS:
                return {"reply": f"ツール呼び出し上限（{MAX_TOOL_CALLS}回）に達しました。", "geojson": final_geojson}

            # ループ検知
            if block.name == last_tool:
                consecutive_same += 1
            else:
                consecutive_same = 1
            last_tool = block.name

            if consecutive_same >= LOOP_THRESHOLD:
                return {
                    "reply": f"同一ツール（{block.name}）が{LOOP_THRESHOLD}回連続したためループを検知し停止しました。",
                    "geojson": final_geojson,
                }

            t = Timer()
            try:
                result = dispatch_tool(block.name, block.input)
                ok = True
            except Exception as e:
                result = {"error": str(e)}
                ok = False

            log_operation(
                request_id=request_id,
                tool_name=block.name,
                input_params=block.input,
                result_summary={"count": result.get("count"), "success": result.get("success")},
                is_success=ok,
                duration_ms=t.elapsed_ms(),
            )

            # GeoJSON があれば保持（最後のものを使用）
            if "features" in result:
                final_geojson = result

            import json
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result, ensure_ascii=False, default=str),
            })

        messages.append({"role": "user", "content": tool_results})
