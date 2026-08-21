import os
import uuid
import time
from collections import defaultdict
from threading import Lock
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from claude_agent import run_agent
from tools.infra_tools import get_facilities
from tools.hazard_tools import get_hazard_info
from tools.road_tools import get_road_status
from tools.estate_tools import search_properties, register_property

app = FastAPI(title="GIS Portfolio API", docs_url=None, redoc_url=None)

_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()
RATE_LIMIT = 10
RATE_WINDOW = 60.0

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    with _rate_lock:
        calls = [t for t in _rate_store[ip] if now - t < RATE_WINDOW]
        if len(calls) >= RATE_LIMIT:
            return False
        calls.append(now)
        _rate_store[ip] = calls
    return True

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://gis.ekmdy.com,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ===== AIチャット =====

class ChatRequest(BaseModel):
    message: str
    app_context: str = "infra"
    map_bbox: list[float] | None = None
    request_id: str | None = None

    @field_validator("message")
    @classmethod
    def message_length(cls, v: str) -> str:
        if len(v) > 500:
            raise ValueError("メッセージは500文字以内にしてください")
        return v.strip()

    @field_validator("app_context")
    @classmethod
    def valid_context(cls, v: str) -> str:
        if v not in ("infra", "hazard", "road", "estate"):
            raise ValueError("不正なapp_context")
        return v

    @field_validator("map_bbox")
    @classmethod
    def valid_bbox(cls, v: list[float] | None) -> list[float] | None:
        if v is None:
            return v
        if len(v) != 4:
            raise ValueError("bboxは4要素必須")
        min_lng, min_lat, max_lng, max_lat = v
        if not (-180 <= min_lng <= 180 and -180 <= max_lng <= 180):
            raise ValueError("不正な経度")
        if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
            raise ValueError("不正な緯度")
        return v

@app.post("/api/chat")
def chat(req: ChatRequest, request: Request):
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown").split(",")[0].strip()
    if not check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="リクエスト上限（10回/分）を超えました。しばらく待ってから再試行してください。")

    request_id = req.request_id or str(uuid.uuid4())
    try:
        result = run_agent(
            message=req.message,
            app_context=req.app_context,
            map_bbox=req.map_bbox,
            request_id=request_id,
        )
        return {"request_id": request_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== 直接データ取得（AI停止時もマップ表示を継続） =====

@app.get("/api/facilities")
def api_get_facilities(
    min_lng: float | None = None,
    min_lat: float | None = None,
    max_lng: float | None = None,
    max_lat: float | None = None,
    status: str | None = None,
    type: str | None = None,
):
    bbox = [min_lng, min_lat, max_lng, max_lat] if all(v is not None for v in [min_lng, min_lat, max_lng, max_lat]) else None
    return get_facilities(bbox=bbox, status=status, type=type)


@app.get("/api/hazard")
def api_get_hazard(
    min_lng: float | None = None,
    min_lat: float | None = None,
    max_lng: float | None = None,
    max_lat: float | None = None,
    hazard_type: str | None = None,
    include_shelters: bool = True,
):
    bbox = [min_lng, min_lat, max_lng, max_lat] if all(v is not None for v in [min_lng, min_lat, max_lng, max_lat]) else None
    return get_hazard_info(bbox=bbox, hazard_type=hazard_type, include_shelters=include_shelters)


@app.get("/api/roads")
def api_get_roads(
    min_lng: float | None = None,
    min_lat: float | None = None,
    max_lng: float | None = None,
    max_lat: float | None = None,
    status: str | None = None,
):
    bbox = [min_lng, min_lat, max_lng, max_lat] if all(v is not None for v in [min_lng, min_lat, max_lng, max_lat]) else None
    return get_road_status(bbox=bbox, status=status)


@app.get("/api/properties")
def api_get_properties(
    min_lng: float | None = None,
    min_lat: float | None = None,
    max_lng: float | None = None,
    max_lat: float | None = None,
    type: str | None = None,
    max_price: float | None = None,
):
    bbox = [min_lng, min_lat, max_lng, max_lat] if all(v is not None for v in [min_lng, min_lat, max_lng, max_lat]) else None
    return search_properties(bbox=bbox, type=type, max_price=max_price)


class PropertyCreate(BaseModel):
    geojson: dict
    name: str
    type: str
    price: float | None = None
    owner: str | None = None

@app.post("/api/properties")
def api_create_property(body: PropertyCreate):
    result = register_property(
        geojson=body.geojson,
        name=body.name,
        type=body.type,
        confirm_token="CONFIRMED",
        price=body.price,
        owner=body.owner,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@app.get("/api/health")
def health():
    return {"status": "ok"}
