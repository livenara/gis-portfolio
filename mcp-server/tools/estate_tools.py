import json
from db import get_db


def search_properties(bbox: list | None = None, type: str | None = None, max_price: float | None = None) -> dict:
    conditions = []
    params = []

    if bbox and len(bbox) == 4:
        conditions.append("ST_Intersects(geom, ST_MakeEnvelope(%s, %s, %s, %s, 4326))")
        params.extend(bbox)

    if type:
        conditions.append("type = %s")
        params.append(type)

    if max_price is not None:
        conditions.append("price <= %s")
        params.append(max_price)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    sql = f"""
        SELECT
            id::text, name, type, area_sqm, price, owner, status,
            ST_AsGeoJSON(geom)::json AS geometry, attributes
        FROM properties
        {where}
        ORDER BY created_at DESC
        LIMIT 100
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
                "area_sqm": float(row["area_sqm"]) if row["area_sqm"] else None,
                "price": int(row["price"]) if row["price"] else None,
                "owner": row["owner"],
                "status": row["status"],
                "attributes": row["attributes"],
            },
        }
        for row in rows
    ]

    return {
        "type": "FeatureCollection",
        "features": features,
        "count": len(features),
    }


def register_property(geojson: dict, name: str, type: str, confirm_token: str,
                      price: float | None = None, owner: str | None = None) -> dict:
    if confirm_token != "CONFIRMED":
        return {"success": False, "error": "confirm_token が無効です。ユーザーに確認を求めてください。"}

    if type not in ("residential", "commercial", "industrial", "land"):
        return {"success": False, "error": f"不正な種別: {type}"}

    # ジオメトリ検証
    geom_json = json.dumps(geojson)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT ST_IsValid(ST_GeomFromGeoJSON(%s))", (geom_json,))
            is_valid = cur.fetchone()["st_isvalid"]
            if not is_valid:
                return {"success": False, "error": "ジオメトリが不正です"}

            cur.execute("""
                INSERT INTO properties (name, type, price, owner, geom)
                VALUES (%s, %s, %s, %s, ST_GeomFromGeoJSON(%s))
                RETURNING id::text, name, type
            """, (name, type, price, owner, geom_json))
            row = cur.fetchone()

    return {"success": True, "id": row["id"], "name": row["name"], "type": row["type"]}
