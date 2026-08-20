import json
from db import get_db


def get_facilities(bbox: list | None = None, status: str | None = None, type: str | None = None) -> dict:
    conditions = []
    params = []

    if bbox and len(bbox) == 4:
        conditions.append(
            "ST_Within(geom, ST_MakeEnvelope(%s, %s, %s, %s, 4326))"
        )
        params.extend(bbox)  # minLng, minLat, maxLng, maxLat

    if status:
        conditions.append("status = %s")
        params.append(status)

    if type:
        conditions.append("type = %s")
        params.append(type)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    sql = f"""
        SELECT
            id::text,
            name,
            type,
            status,
            ST_AsGeoJSON(geom)::json AS geometry,
            attributes,
            inspected_at
        FROM facilities
        {where}
        ORDER BY created_at DESC
        LIMIT 200
    """

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    features = [
        {
            "type": "Feature",
            "geometry": row["geometry"],
            "properties": {
                "id": row["id"],
                "name": row["name"],
                "type": row["type"],
                "status": row["status"],
                "attributes": row["attributes"],
                "inspected_at": row["inspected_at"].isoformat() if row["inspected_at"] else None,
            },
        }
        for row in rows
    ]

    return {
        "type": "FeatureCollection",
        "features": features,
        "count": len(features),
    }


def update_facility_status(facility_id: str, new_status: str, confirm_token: str) -> dict:
    if confirm_token != "CONFIRMED":
        return {"success": False, "error": "confirm_token が無効です。'CONFIRMED' を指定してください。"}

    if new_status not in ("normal", "caution", "repair"):
        return {"success": False, "error": f"不正なステータス: {new_status}"}

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE facilities SET status = %s, updated_at = NOW() WHERE id = %s RETURNING id, name, status",
                (new_status, facility_id),
            )
            row = cur.fetchone()

    if not row:
        return {"success": False, "error": f"ID {facility_id} が見つかりません"}

    return {"success": True, "id": row["id"], "name": row["name"], "new_status": row["status"]}
