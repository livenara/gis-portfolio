import os
import uuid
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from claude_agent import run_agent
from tools.infra_tools import get_facilities
from tools.hazard_tools import get_hazard_info
from tools.road_tools import get_road_status
from tools.estate_tools import search_properties, register_property

app = FastAPI(title="GIS Portfolio API")

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

@app.post("/api/chat")
def chat(req: ChatRequest):
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
