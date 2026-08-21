"""
Evalランナー。

Live eval（推奨）:
  - Claude API は実際に呼び出す（AIの推論をテスト）
  - ツールの実行結果のみモック（DB接続不要）
  - `run_eval_case()` / `run_all_evals()` で実行

Unit eval（CI/CD向け):
  - tests/test_evals.py でClaudeレスポンスもモックして高速実行
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dataclasses import dataclass, field
from typing import Optional
from unittest.mock import patch

from evals.cases import EvalCase, EVAL_CASES

# ツール呼び出しに対するモック応答（形式の正しさを確保しつつDB不要）
MOCK_TOOL_RESPONSES: dict[str, dict] = {
    "get_facilities": {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [135.5, 34.7]},
            "properties": {"id": "f1", "name": "バルブA", "type": "valve", "status": "repair"},
        }],
        "count": 1,
    },
    "get_hazard_info": {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[135.4, 34.6], [135.6, 34.6], [135.6, 34.8], [135.4, 34.8], [135.4, 34.6]]],
            },
            "properties": {"id": "h1", "name": "A地区洪水域", "hazard_type": "flood", "risk_level": 3, "layer": "hazard_zone"},
        }],
        "count": 1,
    },
    "get_road_status": {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": [[135.4, 34.7], [135.5, 34.7]]},
            "properties": {"id": "r1", "name": "国道XX号", "status": "closed"},
        }],
        "count": 1,
    },
    "search_properties": {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[135.4, 34.6], [135.5, 34.6], [135.5, 34.7], [135.4, 34.7], [135.4, 34.6]]],
            },
            "properties": {"id": "p1", "name": "梅田商業ビル", "type": "commercial", "price": 500_000_000},
        }],
        "count": 1,
    },
}


@dataclass
class EvalResult:
    case_id: str
    passed: bool
    errors: list[str] = field(default_factory=list)
    called_tools: list[dict] = field(default_factory=list)
    reply: str = ""
    geojson: Optional[dict] = None

    def summary(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        called = [c["name"] for c in self.called_tools]
        lines = [
            f"[{status}] {self.case_id}",
            f"  called: {called or '(none)'}",
            f"  reply:  {self.reply[:80]!r}",
        ]
        if self.errors:
            lines += [f"  ✗ {e}" for e in self.errors]
        return "\n".join(lines)


def _validate_result(case: EvalCase, result: dict, called_tools: list[dict]) -> list[str]:
    """EvalCaseの期待値と実行結果を比較してエラーリストを返す。"""
    errors: list[str] = []
    tool_names = [c["name"] for c in called_tools]

    if case.expected_tool and case.expected_tool not in tool_names:
        errors.append(f"expected tool '{case.expected_tool}' not called (got: {tool_names})")

    if case.forbidden_tool and case.forbidden_tool in tool_names:
        errors.append(f"forbidden tool '{case.forbidden_tool}' was called (context isolation failure)")

    if case.expected_tool and case.expected_input_contains:
        call = next((c for c in called_tools if c["name"] == case.expected_tool), None)
        if call:
            for key, expected in case.expected_input_contains.items():
                actual = call["inputs"].get(key)
                if actual != expected:
                    errors.append(
                        f"tool input mismatch: {case.expected_tool}.{key}={actual!r} (expected {expected!r})"
                    )

    if case.expect_geojson and not result.get("geojson"):
        errors.append("expected geojson in result but got None")

    if not result.get("reply"):
        errors.append("reply is empty")

    return errors


def run_eval_case(case: EvalCase) -> EvalResult:
    """
    1件のEvalケースを実行する（Live eval: 実Claude API + モックツール）。

    Claude APIを実際に呼び出しAIの判断を検証する。
    ツール応答はMOCK_TOOL_RESPONSESで固定してDB接続を排除。
    """
    called_tools: list[dict] = []

    def mock_dispatch(name: str, inputs: dict) -> dict:
        called_tools.append({"name": name, "inputs": inputs})
        return MOCK_TOOL_RESPONSES.get(name, {"type": "FeatureCollection", "features": [], "count": 0})

    with patch("claude_agent.dispatch_tool", side_effect=mock_dispatch), \
         patch("claude_agent.log_operation"), \
         patch("claude_agent.log_agent_run"):
        from claude_agent import run_agent
        result = run_agent(
            message=case.message,
            app_context=case.context,
            map_bbox=None,
            request_id=f"eval_{case.id}",
        )

    errors = _validate_result(case, result, called_tools)
    return EvalResult(
        case_id=case.id,
        passed=len(errors) == 0,
        errors=errors,
        called_tools=called_tools,
        reply=result.get("reply", ""),
        geojson=result.get("geojson"),
    )


def run_all_evals(cases: list[EvalCase] | None = None) -> list[EvalResult]:
    """全EvalCaseを順次実行してレポートを返す。"""
    cases = cases or EVAL_CASES
    results = [run_eval_case(c) for c in cases]

    passed = sum(1 for r in results if r.passed)
    print(f"\n{'='*50}")
    print(f"Eval Results: {passed}/{len(results)} passed")
    print(f"{'='*50}")
    for r in results:
        print(r.summary())

    return results


if __name__ == "__main__":
    run_all_evals()
