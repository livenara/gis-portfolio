from db import get_db


def get_hazard_info(bbox: list | None = None, hazard_type: str | None = None, include_shelters: bool = True) -> dict:
    features = []

    # ハザードゾーン
    hz_conditions = []
    hz_params = []
    if bbox and len(bbox) == 4:
        hz_conditions.append("ST_Intersects(geom, ST_MakeEnvelope(%s, %s, %s, %s, 4326))")
        hz_params.extend(bbox)
    if hazard_type:
        hz_conditions.append("hazard_type = %s")
        hz_params.append(hazard_type)

    hz_where = ("WHERE " + " AND ".join(hz_conditions)) if hz_conditions else ""
    hz_sql = f"""
        SELECT id::text, name, hazard_type, risk_level,
               ST_AsGeoJSON(geom)::json AS geometry, attributes
        FROM hazard_zones
        {hz_where}
        LIMIT 100
    """

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(hz_sql, hz_params)
            for row in cur.fetchall():
                features.append({
                    "type": "Feature",
                    "geometry": row["geometry"],
                    "properties": {
                        "id": row["id"],
                        "layer": "hazard_zone",
                        "name": row["name"],
                        "hazard_type": row["hazard_type"],
                        "risk_level": row["risk_level"],
                        "attributes": row["attributes"],
                    },
                })

        # 避難所
        if include_shelters:
            sh_conditions = []
            sh_params = []
            if bbox and len(bbox) == 4:
                sh_conditions.append("ST_Within(geom, ST_MakeEnvelope(%s, %s, %s, %s, 4326))")
                sh_params.extend(bbox)

            sh_where = ("WHERE " + " AND ".join(sh_conditions)) if sh_conditions else ""
            sh_sql = f"""
                SELECT id::text, name, capacity, is_active,
                       ST_AsGeoJSON(geom)::json AS geometry, attributes
                FROM shelters
                {sh_where}
                LIMIT 100
            """
            with conn.cursor() as cur:
                cur.execute(sh_sql, sh_params)
                for row in cur.fetchall():
                    features.append({
                        "type": "Feature",
                        "geometry": row["geometry"],
                        "properties": {
                            "id": row["id"],
                            "layer": "shelter",
                            "name": row["name"],
                            "capacity": row["capacity"],
                            "is_active": row["is_active"],
                            "attributes": row["attributes"],
                        },
                    })

    return {
        "type": "FeatureCollection",
        "features": features,
        "count": len(features),
    }
