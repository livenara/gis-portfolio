"""
Evalフレームワークのユニットテスト（Unit eval）。

Claude API もツールも完全にモックして高速実行する。
AIの判断そのものではなく「Evalの判定ロジックとエージェントの配管」を検証する。
実際のAI推論は evals/runner.py の Live eval（CI外で手動実行）で検証する。
"""
import sys
import os
from unittest.mock import MagicMock, patch

# モジュール読み込み前にスタブ注入
_psycopg2 = MagicMock()
_psycopg2.extras = MagicMock()
_psycopg2.extras.RealDictCursor = MagicMock()
sys.modules.setdefault("psycopg2", _psycopg2)
sys.modules.setdefault("psycopg2.extras", _psycopg2.extras)
sys.modules.setdefault("anthropic", MagicMock())
sys.modules.setdefault("dotenv", MagicMock())

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

import pytest
from evals.cases import EVAL_CASES, EvalCase
from evals.runner import _validate_result, EvalResult, MOCK_TOOL_RESPONSES


# ---------- EvalCase定義の健全性 ----------

def test_eval_cases_not_empty():
    assert len(EVAL_CASES) > 0

def test_eval_cases_unique_ids():
    ids = [c.id for c in EVAL_CASES]
    assert len(ids) == len(set(ids)), "EvalCase.idが重複しています"

def test_eval_cases_valid_contexts():
    valid = {"infra", "hazard", "road", "estate"}
    for c in EVAL_CASES:
        assert c.context in valid, f"{c.id}: 不正なcontext={c.context!r}"

def test_all_contexts_covered():
    covered = {c.context for c in EVAL_CASES}
    assert covered == {"infra", "hazard", "road", "estate"}


# ---------- _validate_result のロジック ----------

def _make_case(**kwargs) -> EvalCase:
    defaults = dict(
        id="test", context="infra", message="test",
        description="", expected_tool="get_facilities",
        expect_geojson=True,
    )
    defaults.update(kwargs)
    return EvalCase(**defaults)

def test_validate_pass_when_tool_called():
    case = _make_case(expected_tool="get_facilities", expected_input_contains={"status": "repair"})
    called = [{"name": "get_facilities", "inputs": {"status": "repair"}}]
    result = {"reply": "見つかりました", "geojson": {"type": "FeatureCollection", "features": []}}
    errors = _validate_result(case, result, called)
    assert errors == []

def test_validate_fail_when_wrong_tool():
    case = _make_case(expected_tool="get_facilities")
    called = [{"name": "get_road_status", "inputs": {}}]
    result = {"reply": "応答", "geojson": None}
    errors = _validate_result(case, result, called)
    assert any("get_facilities" in e for e in errors)

def test_validate_fail_when_forbidden_tool_used():
    case = _make_case(expected_tool=None, forbidden_tool="get_facilities", expect_geojson=False)
    called = [{"name": "get_facilities", "inputs": {}}]
    result = {"reply": "応答", "geojson": None}
    errors = _validate_result(case, result, called)
    assert any("context isolation" in e for e in errors)

def test_validate_fail_on_input_mismatch():
    case = _make_case(
        expected_tool="get_facilities",
        expected_input_contains={"status": "repair"},
    )
    called = [{"name": "get_facilities", "inputs": {"status": "normal"}}]
    result = {"reply": "応答", "geojson": {"type": "FeatureCollection", "features": []}}
    errors = _validate_result(case, result, called)
    assert any("status" in e and "repair" in e for e in errors)

def test_validate_fail_when_geojson_expected_but_missing():
    case = _make_case(expected_tool="get_facilities", expect_geojson=True)
    called = [{"name": "get_facilities", "inputs": {}}]
    result = {"reply": "応答", "geojson": None}
    errors = _validate_result(case, result, called)
    assert any("geojson" in e for e in errors)

def test_validate_fail_when_reply_empty():
    case = _make_case(expect_geojson=False, expected_tool=None)
    called = []
    result = {"reply": "", "geojson": None}
    errors = _validate_result(case, result, called)
    assert any("reply" in e for e in errors)


# ---------- モックツール応答の形式チェック ----------

def test_mock_tool_responses_are_valid_geojson():
    from output_validator import validate_geojson_output
    context_map = {
        "get_facilities": "infra",
        "get_hazard_info": "hazard",
        "get_road_status": "road",
        "search_properties": "estate",
    }
    for tool_name, geojson in MOCK_TOOL_RESPONSES.items():
        ctx = context_map.get(tool_name)
        ok, err = validate_geojson_output(geojson, app_context=ctx)
        assert ok, f"{tool_name} のモック応答が不正: {err}"


# ---------- コンテキスト分離（CONTEXT_TOOLSの設定検証） ----------

def test_context_tools_isolation():
    from claude_agent import CONTEXT_TOOLS, TOOL_DEFINITIONS
    all_tool_names = {t["name"] for t in TOOL_DEFINITIONS}
    for context, allowed in CONTEXT_TOOLS.items():
        for tool in allowed:
            assert tool in all_tool_names, f"{context}: 定義にないツール'{tool}'が許可リストに含まれています"

def test_infra_tools_not_in_hazard():
    from claude_agent import CONTEXT_TOOLS
    assert "get_facilities" not in CONTEXT_TOOLS["hazard"]
    assert "get_facilities" not in CONTEXT_TOOLS["road"]
    assert "get_facilities" not in CONTEXT_TOOLS["estate"]

def test_write_tools_only_in_own_context():
    from claude_agent import CONTEXT_TOOLS
    assert "update_facility_status" in CONTEXT_TOOLS["infra"]
    assert "update_facility_status" not in CONTEXT_TOOLS["hazard"]
    assert "register_property" in CONTEXT_TOOLS["estate"]
    assert "register_property" not in CONTEXT_TOOLS["infra"]


# ---------- EvalResult ----------

def test_eval_result_summary_pass():
    r = EvalResult(case_id="test", passed=True, reply="OK")
    assert "PASS" in r.summary()

def test_eval_result_summary_fail():
    r = EvalResult(case_id="test", passed=False, errors=["some error"], reply="bad")
    assert "FAIL" in r.summary()
    assert "some error" in r.summary()
