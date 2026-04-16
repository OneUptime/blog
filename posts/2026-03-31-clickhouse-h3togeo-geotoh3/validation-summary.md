# Validation Summary: How to Use h3ToGeo() and geoToH3() in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (SQL)
- Uber H3 hexagonal geospatial indexing
- H3-related ClickHouse functions: `geoToH3`, `h3ToGeo`, `h3EdgeLengthM`, `h3ToParent`, `geohashEncode`
- MergeTree table engine / materialized columns

## Sources Consulted
- [ClickHouse H3 function reference](https://clickhouse.com/docs/en/sql-reference/functions/geo/h3)
- [ClickHouse geohash function reference](https://clickhouse.com/docs/en/sql-reference/functions/geo/geohash)
- [H3 resolution table (Uber H3 docs)](https://h3geo.org/docs/core-library/restable/)
- ClickHouse changelog notes for v25.1 (`h3ToGeo` return order change) and v25.5 (`geoToH3` argument order change)

## Issues Found

The original post described the legacy ClickHouse H3 argument/return order, which was changed in recent ClickHouse releases. All queries and narrative were updated to reflect the current behavior, and a short note was added referencing the version change and the compatibility settings.

1. **`geoToH3` argument order.** Post described `geoToH3(lon, lat, resolution)` and asserted "Like all ClickHouse geo functions, geoToH3() takes (longitude, latitude)." Per the current ClickHouse docs, as of v25.5 the signature is `geoToH3(lat, lon, resolution)`. Updated the intro, all example queries (Basic Usage, cities example, aggregation, materialized columns, parent-cell example, spatial join, coverage comparison), and the summary. The section "Argument Order: Longitude First" was renamed to "Argument Order: Latitude First" with corrected explanation, including a clarification that `geohashEncode` still takes `(lon, lat)` so the two are not consistent.

2. **`h3ToGeo` tuple return order.** Post labelled `.1` as `center_lon` and `.2` as `center_lat`. Per current docs, as of v25.1 `h3ToGeo` returns `(lat, lon)`, so `.1` is latitude and `.2` is longitude. Updated both the Basic Usage decode example and the Decoding H3 Indexes for Map Export example (including the sample output). Summary text was also updated.

3. **Resolution 5 cell size annotation.** The comment `-- Encode several cities at resolution 5 (~252 km hexagons)` conflated H3 area (~252.9 km² per cell at res 5) with edge length (~8.5 km at res 5). The resolution table further down in the same post lists edge lengths, so the convention is edge length. Updated the comment to `-- Encode several cities at resolution 5 (~8 km edge, ~253 km² area)` to be both accurate and self-consistent with the resolution reference table.

4. **Version compatibility note added.** A short paragraph was added after the intro explaining the v25.1 / v25.5 behavior change and pointing readers at `geotoh3_argument_order = 'lon_lat'` and `h3togeo_lon_lat_result_order = 1` for restoring legacy behavior. This prevents readers on older ClickHouse deployments from being confused.

## Review Notes
- The `h3EdgeLengthM` reference table values (1107712 m, 418676 m, 1220 m, 461 m, 174 m, 66 m, 25 m, 9 m) were cross-checked against the H3 average hexagon edge length table and are correct to the rounding shown.
- The example H3 index `617700169958293503` for San Francisco at resolution 9 is a plausible H3 index for that area; the specific value was not recomputed independently, but the cell-center decode output and index are internally consistent.
- The claim that every hexagon has exactly six equal-distance neighbors is a minor simplification — H3 has 12 pentagonal cells (one per icosahedron vertex) that have only five neighbors, and cell shape/area varies slightly across the globe. This is a standard simplification in H3 introductions and was left in place.
- The `regions_h3` sample index values (`599686042433355775` etc.) were left unchanged; they were plausible-looking res-5 indexes used only as illustrative constants in the tutorial and not critical to the correctness of the explained mechanics.
