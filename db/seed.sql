-- seed.sql - 大阪エリアのサンプルデータ

-- ===== 設備管理（infra）=====
INSERT INTO facilities (name, type, status, geom, attributes, inspected_at) VALUES
('梅田ガスバルブ#1',   'valve',         'caution', ST_SetSRID(ST_MakePoint(135.4960, 34.7055), 4326), '{"pressure":"0.3MPa","install_year":2005}', NOW() - INTERVAL '30 days'),
('梅田電柱A-12',       'electric_pole', 'normal',  ST_SetSRID(ST_MakePoint(135.4975, 34.7042), 4326), '{"voltage":"6600V","install_year":2010}', NOW() - INTERVAL '7 days'),
('中崎町ガス管継ぎ手', 'gas_pipe',      'repair',  ST_SetSRID(ST_MakePoint(135.5012, 34.7089), 4326), '{"diameter":"100mm","material":"PE"}', NOW() - INTERVAL '60 days'),
('天神橋バルブ#3',     'valve',         'normal',  ST_SetSRID(ST_MakePoint(135.5098, 34.7134), 4326), '{"pressure":"0.1MPa","install_year":2015}', NOW() - INTERVAL '14 days'),
('南森町電柱B-5',      'electric_pole', 'caution', ST_SetSRID(ST_MakePoint(135.5145, 34.7101), 4326), '{"voltage":"200V","install_year":2003}', NOW() - INTERVAL '45 days'),
('扇町ガスバルブ#7',   'valve',         'normal',  ST_SetSRID(ST_MakePoint(135.5067, 34.7156), 4326), '{"pressure":"0.3MPa","install_year":2018}', NOW() - INTERVAL '3 days'),
('堂島変圧器C-2',      'transformer',   'normal',  ST_SetSRID(ST_MakePoint(135.4988, 34.6978), 4326), '{"capacity":"500kVA","install_year":2012}', NOW() - INTERVAL '20 days'),
('福島ガス管T字',      'gas_pipe',      'caution', ST_SetSRID(ST_MakePoint(135.4912, 34.6990), 4326), '{"diameter":"150mm","material":"鋼管"}', NOW() - INTERVAL '90 days'),
('北新地電柱D-8',      'electric_pole', 'normal',  ST_SetSRID(ST_MakePoint(135.4934, 34.6967), 4326), '{"voltage":"100V","install_year":2019}', NOW() - INTERVAL '5 days'),
('西梅田バルブ#2',     'valve',         'repair',  ST_SetSRID(ST_MakePoint(135.4921, 34.7023), 4326), '{"pressure":"0.2MPa","install_year":2000}', NOW() - INTERVAL '120 days');

-- ===== ハザードゾーン（hazard）=====
INSERT INTO hazard_zones (name, hazard_type, risk_level, geom, attributes) VALUES
('淀川浸水想定区域A', 'flood', 4,
  ST_SetSRID(ST_GeomFromText('POLYGON((135.480 34.725, 135.510 34.725, 135.510 34.710, 135.480 34.710, 135.480 34.725))'), 4326),
  '{"depth_m":2.5,"source":"国土地理院"}'),
('神崎川浸水区域',   'flood', 3,
  ST_SetSRID(ST_GeomFromText('POLYGON((135.460 34.730, 135.480 34.730, 135.480 34.720, 135.460 34.720, 135.460 34.730))'), 4326),
  '{"depth_m":1.0,"source":"国土地理院"}'),
('箕面土砂災害警戒区域', 'landslide', 5,
  ST_SetSRID(ST_GeomFromText('POLYGON((135.465 34.838, 135.480 34.838, 135.480 34.828, 135.465 34.828, 135.465 34.838))'), 4326),
  '{"soil_type":"崩積土","source":"大阪府"}'),
('大阪市内低地浸水域', 'flood', 2,
  ST_SetSRID(ST_GeomFromText('POLYGON((135.495 34.665, 135.530 34.665, 135.530 34.650, 135.495 34.650, 135.495 34.665))'), 4326),
  '{"depth_m":0.5,"source":"大阪市"}');

-- ===== 避難所（hazard）=====
INSERT INTO shelters (name, capacity, geom, attributes) VALUES
('大阪市立梅田小学校',    500, ST_SetSRID(ST_MakePoint(135.4963, 34.7071), 4326), '{"tel":"06-1234-5678","type":"指定避難所"}'),
('大阪市立南森町中学校',  800, ST_SetSRID(ST_MakePoint(135.5123, 34.7098), 4326), '{"tel":"06-2345-6789","type":"指定避難所"}'),
('扇町公園避難場所',     2000, ST_SetSRID(ST_MakePoint(135.5089, 34.7167), 4326), '{"tel":"","type":"広域避難場所"}'),
('大阪市立堂島小学校',    400, ST_SetSRID(ST_MakePoint(135.4991, 34.6985), 4326), '{"tel":"06-3456-7890","type":"指定避難所"}'),
('中之島公園緊急避難場所',3000, ST_SetSRID(ST_MakePoint(135.5012, 34.6934), 4326), '{"tel":"","type":"広域避難場所"}'),
('福島区民センター',       600, ST_SetSRID(ST_MakePoint(135.4889, 34.6998), 4326), '{"tel":"06-4567-8901","type":"指定避難所"}');

-- ===== 道路区間（road）=====
INSERT INTO road_segments (name, status, traffic_volume, geom, attributes, inspected_at) VALUES
('御堂筋（梅田〜本町）',   'normal',       8500, ST_SetSRID(ST_GeomFromText('LINESTRING(135.4955 34.7021, 135.4958 34.6854)'), 4326), '{"lanes":6,"speed_limit":40}', NOW() - INTERVAL '2 days'),
('堂島大橋',               'construction', 2100, ST_SetSRID(ST_GeomFromText('LINESTRING(135.4889 34.6937, 135.4923 34.6945)'), 4326), '{"lanes":2,"speed_limit":30,"work_end":"2026-09-30"}', NOW() - INTERVAL '1 day'),
('天神橋筋',               'normal',       3200, ST_SetSRID(ST_GeomFromText('LINESTRING(135.5112 34.7156, 135.5101 34.6934)'), 4326), '{"lanes":4,"speed_limit":40}', NOW() - INTERVAL '5 days'),
('桜ノ宮橋（通行止め）',   'closed',          0, ST_SetSRID(ST_GeomFromText('LINESTRING(135.5223 34.7178, 135.5234 34.7145)'), 4326), '{"lanes":0,"reason":"橋梁点検"}', NOW()),
('阪神高速11号池田線',     'normal',      12000, ST_SetSRID(ST_GeomFromText('LINESTRING(135.4734 34.7234, 135.4823 34.7123)'), 4326), '{"lanes":2,"speed_limit":60}', NOW() - INTERVAL '10 days'),
('国道1号線（福島区）',    'construction', 4500, ST_SetSRID(ST_GeomFromText('LINESTRING(135.4801 34.6945, 135.4934 34.6956)'), 4326), '{"lanes":2,"speed_limit":30,"work_end":"2026-09-15"}', NOW() - INTERVAL '3 days'),
('谷町筋（天満〜本町）',   'normal',       5600, ST_SetSRID(ST_GeomFromText('LINESTRING(135.5178 34.7089, 135.5167 34.6878)'), 4326), '{"lanes":4,"speed_limit":40}', NOW() - INTERVAL '7 days');

-- ===== 不動産物件（estate）=====
INSERT INTO properties (name, type, area_sqm, price, owner, status, geom, attributes) VALUES
('梅田センタービル敷地',  'commercial',   2340.5, 1500000000, '株式会社梅田不動産', 'available',
  ST_SetSRID(ST_GeomFromText('POLYGON((135.4978 34.7056, 135.4991 34.7056, 135.4991 34.7048, 135.4978 34.7048, 135.4978 34.7056))'), 4326),
  '{"floors":20,"build_year":2015,"use":"オフィス"}'),
('中崎町住宅地A区画',     'residential',   890.0,  250000000, '田中一郎', 'sold',
  ST_SetSRID(ST_GeomFromText('POLYGON((135.5023 34.7095, 135.5034 34.7095, 135.5034 34.7088, 135.5023 34.7088, 135.5023 34.7095))'), 4326),
  '{"floors":3,"build_year":2020,"use":"共同住宅"}'),
('堂島リバーサイド土地',  'land',         1200.0,  800000000, '大阪市', 'available',
  ST_SetSRID(ST_GeomFromText('POLYGON((135.4967 34.6978, 135.4981 34.6978, 135.4981 34.6970, 135.4967 34.6970, 135.4967 34.6978))'), 4326),
  '{"zoning":"商業地域","far":800}'),
('福島工業団地B棟',       'industrial',  5600.0,  350000000, '株式会社福島工業', 'leased',
  ST_SetSRID(ST_GeomFromText('POLYGON((135.4867 34.6988, 135.4890 34.6988, 135.4890 34.6975, 135.4867 34.6975, 135.4867 34.6988))'), 4326),
  '{"floors":3,"build_year":2000,"use":"倉庫・工場"}');
