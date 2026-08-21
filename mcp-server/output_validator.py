"""
AIエージェントが返したGeoJSON出力のスキーマ検証。
コンテキスト別に許容するジオメトリ型を制限し、不正な出力を地図に反映させない。
"""
from typing import Optional

GEOMETRY_TYPE_BY_CONTEXT: dict[str, set[str]] = {
    "infra":   {"Point"},
    "hazard":  {"Polygon", "MultiPolygon", "Point"},
    "road":    {"LineString", "MultiLineString"},
    "estate":  {"Polygon", "MultiPolygon"},
}


def validate_geojson_output(
    geojson: dict,
    app_context: Optional[str] = None,
) -> tuple[bool, str]:
    """
    GeoJSON FeatureCollectionのスキーマを検証する。

    Args:
        geojson: 検証対象のdict
        app_context: コンテキスト名（指定するとジオメトリ型も検証）

    Returns:
        (is_valid, error_message) — 正常時はerror_message=""
    """
    if not isinstance(geojson, dict):
        return False, "GeoJSONはdictである必要があります"

    if geojson.get("type") != "FeatureCollection":
        return False, f"type=FeatureCollectionが必要 (got: {geojson.get('type')!r})"

    features = geojson.get("features")
    if not isinstance(features, list):
        return False, "featuresはlistである必要があります"

    allowed_geom = GEOMETRY_TYPE_BY_CONTEXT.get(app_context, set()) if app_context else set()

    for i, feature in enumerate(features):
        if not isinstance(feature, dict):
            return False, f"features[{i}]はdictである必要があります"
        if feature.get("type") != "Feature":
            return False, f"features[{i}].type=Featureが必要 (got: {feature.get('type')!r})"
        if "properties" not in feature:
            return False, f"features[{i}].propertiesが必要"

        geom = feature.get("geometry")
        if geom is not None:
            if not isinstance(geom, dict) or "type" not in geom:
                return False, f"features[{i}].geometryが不正"
            if allowed_geom and geom["type"] not in allowed_geom:
                return False, (
                    f"features[{i}]: geometry.type={geom['type']!r}は"
                    f"コンテキスト'{app_context}'で不正 (期待値: {sorted(allowed_geom)})"
                )

    return True, ""
