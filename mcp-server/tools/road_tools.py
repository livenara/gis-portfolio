from db import get_db


def get_road_status(bbox: list | None = None, status: str | None = None) -> dict:
    conditions = []
    params = []

    if bbox and len(bbox) == 4:
        conditions.append("ST_Intersects(geom, ST_MakeEnvelope(%s, %s, %s, %s, 4326))")
        params.extend(bbox)

    if status:
        conditions.append("status = %s")
        params.append(status)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    sql = f"""
        SELECT
            id::text, name, status, traffic_volume,
            ST_AsGeoJSON(geom)::json AS geometry,
            attributes, inspected_at
        FROM road_segments
        {where}
        ORDER BY traffic_volume DESC
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
                "status": row["status"],
                "traffic_volume": row["traffic_volume"],
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
