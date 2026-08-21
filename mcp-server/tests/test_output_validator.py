"""output_validatorのユニットテスト。"""
import sys
from unittest.mock import MagicMock

sys.modules.setdefault("psycopg2", MagicMock())
sys.modules.setdefault("psycopg2.extras", MagicMock())

import pytest
from output_validator import validate_geojson_output


def _make_fc(*features):
    return {"type": "FeatureCollection", "features": list(features)}

def _point_feature():
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [135.5, 34.7]},
        "properties": {"id": "1"},
    }

def _polygon_feature():
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [[[135.4, 34.6], [135.6, 34.6], [135.6, 34.8], [135.4, 34.6]]]},
        "properties": {"id": "1"},
    }

def _linestring_feature():
    return {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": [[135.4, 34.7], [135.5, 34.7]]},
        "properties": {"id": "1"},
    }


# ---------- 基本スキーマ ----------

def test_valid_empty_fc():
    ok, err = validate_geojson_output({"type": "FeatureCollection", "features": []})
    assert ok and err == ""

def test_valid_point_fc():
    ok, err = validate_geojson_output(_make_fc(_point_feature()))
    assert ok and err == ""

def test_not_dict():
    ok, err = validate_geojson_output("not a dict")
    assert not ok and "dict" in err

def test_wrong_root_type():
    ok, err = validate_geojson_output({"type": "Feature", "geometry": None, "properties": {}})
    assert not ok and "FeatureCollection" in err

def test_features_not_list():
    ok, err = validate_geojson_output({"type": "FeatureCollection", "features": "bad"})
    assert not ok and "list" in err

def test_feature_missing_properties():
    f = {"type": "Feature", "geometry": {"type": "Point", "coordinates": [0, 0]}}
    ok, err = validate_geojson_output(_make_fc(f))
    assert not ok and "properties" in err

def test_feature_wrong_type():
    f = {"type": "NotFeature", "geometry": None, "properties": {}}
    ok, err = validate_geojson_output(_make_fc(f))
    assert not ok and "Feature" in err

def test_null_geometry_allowed():
    f = {"type": "Feature", "geometry": None, "properties": {}}
    ok, err = validate_geojson_output(_make_fc(f))
    assert ok and err == ""


# ---------- コンテキスト別ジオメトリ型制限 ----------

class TestContextValidation:
    def test_infra_point_ok(self):
        ok, _ = validate_geojson_output(_make_fc(_point_feature()), app_context="infra")
        assert ok

    def test_infra_polygon_rejected(self):
        ok, err = validate_geojson_output(_make_fc(_polygon_feature()), app_context="infra")
        assert not ok and "infra" in err

    def test_hazard_polygon_ok(self):
        ok, _ = validate_geojson_output(_make_fc(_polygon_feature()), app_context="hazard")
        assert ok

    def test_hazard_point_ok(self):
        ok, _ = validate_geojson_output(_make_fc(_point_feature()), app_context="hazard")
        assert ok

    def test_hazard_linestring_rejected(self):
        ok, err = validate_geojson_output(_make_fc(_linestring_feature()), app_context="hazard")
        assert not ok and "hazard" in err

    def test_road_linestring_ok(self):
        ok, _ = validate_geojson_output(_make_fc(_linestring_feature()), app_context="road")
        assert ok

    def test_road_point_rejected(self):
        ok, err = validate_geojson_output(_make_fc(_point_feature()), app_context="road")
        assert not ok and "road" in err

    def test_estate_polygon_ok(self):
        ok, _ = validate_geojson_output(_make_fc(_polygon_feature()), app_context="estate")
        assert ok

    def test_estate_point_rejected(self):
        ok, err = validate_geojson_output(_make_fc(_point_feature()), app_context="estate")
        assert not ok and "estate" in err

    def test_unknown_context_no_geom_restriction(self):
        ok, _ = validate_geojson_output(_make_fc(_point_feature()), app_context="unknown")
        assert ok
