"""
APIエンドポイントのユニットテスト。
DB・Claude APIへの実際の接続は行わず、ビジネスロジックのみを検証する。
"""
import sys
import os
from types import ModuleType
from unittest.mock import MagicMock, patch

# psycopg2とanthropicのスタブをimport前に挿入
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
from fastapi.testclient import TestClient
from main import app, check_rate_limit, _rate_store

client = TestClient(app, raise_server_exceptions=False)


# ---------- /api/health ----------

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


# ---------- APIドキュメント非公開 ----------

def test_docs_disabled():
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404


# ---------- /api/chat バリデーション ----------

class TestChatValidation:
    def test_message_too_long(self):
        res = client.post("/api/chat", json={"message": "x" * 501, "app_context": "infra"})
        assert res.status_code == 422
        body = res.json()
        assert any("500文字" in str(d) for d in body["detail"])

    def test_invalid_app_context(self):
        res = client.post("/api/chat", json={"message": "test", "app_context": "invalid"})
        assert res.status_code == 422

    def test_valid_contexts_accepted(self):
        for ctx in ("infra", "hazard", "road", "estate"):
            with patch("main.run_agent", return_value={"reply": "ok", "geojson": None}):
                res = client.post("/api/chat", json={"message": "test", "app_context": ctx})
                assert res.status_code == 200, f"context={ctx} should be accepted"

    def test_bbox_wrong_length(self):
        res = client.post("/api/chat", json={"message": "test", "map_bbox": [1.0, 2.0]})
        assert res.status_code == 422

    def test_bbox_invalid_longitude(self):
        res = client.post("/api/chat", json={"message": "test", "map_bbox": [200.0, 34.0, 201.0, 35.0]})
        assert res.status_code == 422

    def test_bbox_valid(self):
        with patch("main.run_agent", return_value={"reply": "ok", "geojson": None}):
            res = client.post("/api/chat", json={
                "message": "test",
                "map_bbox": [135.0, 34.0, 136.0, 35.0],
            })
            assert res.status_code == 200

    def test_message_stripped(self):
        with patch("main.run_agent", return_value={"reply": "ok", "geojson": None}) as mock_agent:
            client.post("/api/chat", json={"message": "  hello  ", "app_context": "infra"})
            assert mock_agent.call_args.kwargs["message"] == "hello"


# ---------- レート制限 ----------

class TestRateLimit:
    def setup_method(self):
        _rate_store.clear()

    def test_rate_limit_triggered(self):
        with patch("main.run_agent", return_value={"reply": "ok", "geojson": None}):
            for _ in range(10):
                client.post(
                    "/api/chat",
                    json={"message": "test", "app_context": "infra"},
                    headers={"X-Forwarded-For": "10.0.0.1"},
                )
            res = client.post(
                "/api/chat",
                json={"message": "test", "app_context": "infra"},
                headers={"X-Forwarded-For": "10.0.0.1"},
            )
        assert res.status_code == 429

    def test_different_ips_independent(self):
        with patch("main.run_agent", return_value={"reply": "ok", "geojson": None}):
            for _ in range(10):
                client.post(
                    "/api/chat",
                    json={"message": "test", "app_context": "infra"},
                    headers={"X-Forwarded-For": "10.0.0.2"},
                )
            res = client.post(
                "/api/chat",
                json={"message": "test", "app_context": "infra"},
                headers={"X-Forwarded-For": "10.0.0.3"},
            )
        assert res.status_code == 200


# ---------- check_rate_limit ユニット ----------

def test_check_rate_limit_logic():
    _rate_store.clear()
    ip = "192.168.99.1"
    for _ in range(10):
        assert check_rate_limit(ip) is True
    assert check_rate_limit(ip) is False
    _rate_store.clear()
