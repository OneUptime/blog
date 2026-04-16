# Validation Summary: How to Use geohashesInBox() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL, geospatial functions)
- Geohash encoding / spatial indexing
- `geohashesInBox`, `geohashEncode`, `geohashDecode`
- `arrayJoin`, `arrayFilter`, `arrayConcat`, `groupArray`, `has`

## Sources Consulted
- ClickHouse official docs — Geo functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/geohash
- ClickHouse docs on `geohashesInBox`, `geohashEncode`, `geohashDecode` function signatures, argument order, and return types

## Issues Found
- **Inconsistent comment about precision / cell size** in the "Spatial Proximity Query" section. The code uses precision `6` but the inline comment claimed "geohash-5 cells ~5x5 km" and "within ~1.5 degrees of a point", neither of which matches the code. Geohash-6 cells are approximately 1.2 km x 0.6 km, and the bounding box spans roughly 0.17° x 0.19°. Updated the comment to accurately describe the query: `-- Events within a bounding box around San Francisco (using geohash-6 cells ~1.2 x 0.6 km)`.

## Review Notes
- Function signature `geohashesInBox(longitude_min, latitude_min, longitude_max, latitude_max, precision)` matches ClickHouse documentation (longitude first, then latitude in each pair). Blog's usage is correct.
- `geohashDecode` returns a `Tuple(Float64, Float64)` as `(longitude, latitude)`, so `.1 AS center_lon` and `.2 AS center_lat` are correct.
- Precision range [1, 12] is accurate.
- Illustrative output numbers (e.g., `cell_count 42` for SF box at precision 6, or the precision-vs-count table) are approximate and meant as pedagogical examples; they do not reflect exact results from running the query, but this is acceptable for a tutorial and does not mislead on the function behavior.
- The "Geofence Coverage Check" query mixes an aggregate (`groupArray`) with a constant CTE (`zone_cells`) — this is valid because there is no GROUP BY and the aggregate reduces over the whole table.
- ClickHouse enforces a maximum result size for `geohashesInBox` (controlled by `geo_distance_returns_float64_t`/`max_array_size` settings in various versions). The post's "Keep precision at 6 or below for region-scale queries" guidance is reasonable practical advice.
