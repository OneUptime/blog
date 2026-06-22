# Validation Summary: How to Use ClickHouse for Geospatial Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse geospatial data types and functions
- H3 hexagonal indexing
- ClickHouse MergeTree, AggregatingMergeTree, materialized views, and data skipping indexes
- SQL window functions

## Sources Consulted
- ClickHouse Geometric data types: https://clickhouse.com/docs/sql-reference/data-types/geo
- ClickHouse geographical coordinate functions: https://clickhouse.com/docs/sql-reference/functions/geo/coordinates
- ClickHouse H3 functions: https://clickhouse.com/docs/sql-reference/functions/geo/h3
- ClickHouse polygon functions and WKT/WKB helpers: https://clickhouse.com/docs/sql-reference/functions/geo/polygons
- ClickHouse AggregatingMergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse AggregateFunction type: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse data skipping indexes: https://clickhouse.com/docs/optimize/skipping-indexes
- ClickHouse manipulating data skipping indexes: https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index
- ClickHouse window functions and lag: https://clickhouse.com/docs/sql-reference/window-functions and https://clickhouse.com/docs/sql-reference/window-functions/lag
- H3 cell statistics reference: https://h3geo.org/docs/core-library/restable/

## Issues Found
- The post used the pre-v25.5 `geoToH3(longitude, latitude, resolution)` argument order throughout. Updated examples to the current `geoToH3(latitude, longitude, resolution)` order documented by ClickHouse.
- The `pointInPolygon` examples wrapped polygon vertices in tuple syntax such as `[(...)]`, which does not match ClickHouse's ring/polygon array shapes. Updated simple polygons to use an array of point tuples and polygons with holes to use an array of rings.
- The `h3ToGeo` example attempted `AS (center_lat, center_lon)`, which is not a valid way to name tuple elements. Replaced it with `tupleElement(h3ToGeo(...), 1)` and `tupleElement(..., 2)`.
- The H3 resolution 9 comment described "approximately 100m hexagons." Updated it to "approximately 174m average edge length" to match the resolution table used by the article.
- The H3 neighbor aggregation used a correlated scalar subquery pattern that is unreliable and could over-scan. Rewrote it using CTEs, `h3kRing`, `arrayJoin`, and joins so direct and neighborhood counts are computed explicitly.
- The movement-pattern query grouped using alias assignments inside `GROUP BY`. Moved the aliases into the outer `SELECT` list and grouped by those aliases.
- The delivery zone schema stored `zone_polygon` as a single ring but later wrapped it as a polygon. Changed the column type to `Polygon` and passed it directly to `pointInPolygon`.
- The materialized view mixed `SummingMergeTree` with `uniqState`, which requires aggregate-state merging. Changed the example to `AggregatingMergeTree` with `countState()` / `countMerge()` and `uniqState()` / `uniqMerge()`.

## Review Notes
The article still uses `greatCircleDistance`, which is valid. ClickHouse also provides `geoDistance` for WGS-84 ellipsoid distances; that could be mentioned in a future broader revision, but it was not necessary to validate the existing tutorial.
