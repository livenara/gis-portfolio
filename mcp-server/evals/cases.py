"""
AIエージェントのEvalケース定義。
各ケースは「どんな入力に対してどのツールがどのパラメータで呼ばれるべきか」を記述する。
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class EvalCase:
    id: str
    context: str
    message: str
    description: str
    expected_tool: Optional[str]
    expected_input_contains: dict = field(default_factory=dict)
    forbidden_tool: Optional[str] = None
    expect_geojson: bool = True


EVAL_CASES: list[EvalCase] = [
    # ---------- infra ----------
    EvalCase(
        id="infra_repair",
        context="infra",
        message="修理が必要な設備を探して",
        description="'修理' → status=repair のマッピング",
        expected_tool="get_facilities",
        expected_input_contains={"status": "repair"},
    ),
    EvalCase(
        id="infra_caution",
        context="infra",
        message="要点検の設備を一覧で見たい",
        description="'要点検' → status=caution のマッピング",
        expected_tool="get_facilities",
        expected_input_contains={"status": "caution"},
    ),

    # ---------- hazard ----------
    EvalCase(
        id="hazard_flood",
        context="hazard",
        message="洪水ハザードゾーンを表示して",
        description="'洪水' → hazard_type=flood のマッピング",
        expected_tool="get_hazard_info",
        expected_input_contains={"hazard_type": "flood"},
    ),
    EvalCase(
        id="hazard_shelters",
        context="hazard",
        message="このエリアの避難所を教えて",
        description="'避難所' → include_shelters=True のフラグ制御",
        expected_tool="get_hazard_info",
        expected_input_contains={"include_shelters": True},
    ),

    # ---------- road ----------
    EvalCase(
        id="road_closed",
        context="road",
        message="通行止めの道路はどこ？",
        description="'通行止め' → status=closed のマッピング",
        expected_tool="get_road_status",
        expected_input_contains={"status": "closed"},
    ),
    EvalCase(
        id="road_construction",
        context="road",
        message="工事中の道路を見せて",
        description="'工事中' → status=construction のマッピング",
        expected_tool="get_road_status",
        expected_input_contains={"status": "construction"},
    ),

    # ---------- estate ----------
    EvalCase(
        id="estate_commercial",
        context="estate",
        message="商業物件を探してください",
        description="'商業' → type=commercial のマッピング",
        expected_tool="search_properties",
        expected_input_contains={"type": "commercial"},
    ),
    EvalCase(
        id="estate_residential",
        context="estate",
        message="住宅地を検索したい",
        description="'住宅' → type=residential のマッピング",
        expected_tool="search_properties",
        expected_input_contains={"type": "residential"},
    ),

    # ---------- コンテキスト分離 ----------
    EvalCase(
        id="context_isolation_infra_in_hazard",
        context="hazard",
        message="設備の修理状況を確認したい",
        description="hazardコンテキストでinfraツール(get_facilities)が呼ばれないこと",
        expected_tool="get_hazard_info",
        forbidden_tool="get_facilities",
        expect_geojson=False,
    ),
    EvalCase(
        id="context_isolation_road_in_estate",
        context="estate",
        message="通行止めの道路を教えて",
        description="estateコンテキストでroadツール(get_road_status)が呼ばれないこと",
        expected_tool=None,
        forbidden_tool="get_road_status",
        expect_geojson=False,
    ),
]
