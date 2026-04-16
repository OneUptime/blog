# Validation Summary: How to Build Geo-Aggregations with Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree, SummingMergeTree, Materialized Views)
- H3 hexagonal hierarchical geospatial indexing system
- ClickHouse native H3 functions (`geoToH3`, `h3ToGeo`, `h3ToString`)

## Sources Consulted
- ClickHouse H3 geo functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/geo/h3
- ClickHouse MergeTree / SummingMergeTree / Materialized View docs
- H3 core library resolution reference table: https://h3geo.org/docs/core-library/restable

## Issues Found

1. **Wrong argument order for `geoToH3`.** The post called `geoToH3(longitude, latitude, 7)`. As of ClickHouse v25.5, the canonical signature is `geoToH3(lat, lon, resolution)` (the old `(lon, lat, res)` order was changed and is only retained behind the `geotoh3_argument_order = 'lon_lat'` setting). Fixed to `geoToH3(latitude, longitude, 7)` to match current behavior.

2. **Non-existent functions `h3GetLat` / `h3GetLon`.** ClickHouse does not expose `h3GetLat` or `h3GetLon`. The correct function is `h3ToGeo(h3Index)`, which returns a `(lat, lon)` tuple (as of v25.1; previously `(lon, lat)` in v24.12). Replaced the two calls with `h3ToGeo(h3_cell).1` (lat) and `h3ToGeo(h3_cell).2` (lon), and added a brief clarifying comment.

3. **Inaccurate H3 resolution cell sizes.** The drilldown comments listed "Resolution 4 (~500km)", "Resolution 7 (~5km)", and "Resolution 10 (~100m)". The authoritative H3 resolution table gives average edge lengths of ~26 km (res 4), ~1.4 km (res 7), and ~76 m (res 10). "500km" for res 4 is an order of magnitude off. Corrected the three entries to "~25km edge", "~1.4km edge", "~75m edge". Also tightened the earlier "(~5km cells)" comment for res 7 to "(~1.4km edge, ~5 km² cells)" so the earlier and later descriptions agree and the ambiguity between edge length and area is removed.

## Review Notes
- `h3ToString`, `SummingMergeTree`, `LowCardinality`, `toYYYYMM`, `toDate`, `toStartOfMonth`, `uniqExact`, and materialized-view-with-TO-target syntax all check out against current ClickHouse docs.
- The `geoToH3` argument-order change is a known backwards-incompatible shift (v25.5); readers on ClickHouse <=25.4 will need either to swap the arguments back or set `geotoh3_argument_order = 'lon_lat'`. Worth flagging in a future revision if this post is kept long-term.
- `h3ToGeo(expr).1 / .2` re-evaluates the function call twice. In practice this is fine at heatmap scales, but a future improvement would be `WITH h3ToGeo(h3_cell) AS coords SELECT coords.1, coords.2 ...` or `tupleElement`.
- The `GROUP BY event_date, h3_cell, event_type` in the MV references `h3_cell` (the alias of the `geoToH3` expression). Modern ClickHouse accepts column aliases in `GROUP BY`; on very old versions one would need to repeat the expression. Not worth changing.
