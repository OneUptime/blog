# Validation Summary: How to Build Geospatial Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree, materialized columns, skip indexes)
- Uber H3 hexagonal hierarchical spatial index (via `geoToH3`, `h3ToGeo`)
- Geohash encoding (`geohashEncode`, `geohashDecode`, `geohashesInBox`)
- Polygon containment (`pointInPolygon`)
- Great-circle distance (`greatCircleDistance`)
- ClickHouse window functions (`leadInFrame`)

## Sources Consulted
- ClickHouse H3 functions docs: https://clickhouse.com/docs/en/sql-reference/functions/geo/h3
- ClickHouse geohash functions docs: https://clickhouse.com/docs/en/sql-reference/functions/geo/geohash
- ClickHouse coordinates functions docs: https://clickhouse.com/docs/en/sql-reference/functions/geo/coordinates
- ClickHouse PR that changed `geoToH3` argument order to `(lat, lon, res)` in v25.5: https://github.com/ClickHouse/ClickHouse/pull/78852
- ClickHouse 25.1 release notes documenting `h3ToGeo` return-tuple order change to `(lat, lon)`
- ClickHouse window functions / `leadInFrame` docs: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found

1. **`geoToH3` argument order is outdated.** The post called `geoToH3(longitude, latitude, resolution)`, which was valid in ClickHouse ≤ 25.4. As of v25.5 the official signature is `geoToH3(lat, lon, resolution)` (current ClickHouse in April 2026 is 26.x). Fixed all five call sites:
   - `location_events` schema: both `h3_r7` and `h3_r9` MATERIALIZED definitions.
   - Pattern 5: `geoToH3(longitude, latitude, 5)`.
   - Pattern 8: both `geoToH3(g.longitude, g.latitude, 5)` occurrences.
   - Performance checklist: `geoToH3(-73.9857, 40.7484, 7)` (flipped to `geoToH3(40.7484, -73.9857, 7)`).

2. **`h3ToGeo` return tuple order is outdated.** The post assumed `h3ToGeo(...).1` = longitude, `.2` = latitude, which was valid in ClickHouse ≤ 24.12. As of v25.1, `h3ToGeo` returns `(lat, lon)`, so `.1` is latitude and `.2` is longitude. Fixed Pattern 3 (`center_lon`/`center_lat` aliases) and Pattern 8 (`region_lon`/`region_lat` aliases plus the `GROUP BY` column order).

3. **Pattern 6 misused `neighbor()` as an H3 neighbor function.** `neighbor(h3_r7, 1)` in ClickHouse is a legacy row-position function that returns the value of a column from the next row of the query result — it has nothing to do with H3 spatial neighbors, and in the original subquery there was no `ORDER BY`, so results were non-deterministic and could cross users. Rewrote Pattern 6 to use `leadInFrame` as a window function partitioned by `user_id` and ordered by `event_time` with an explicit `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING` frame, so `dest_cell` is the same user's next checkout cell. Also added `origin_cell != dest_cell` to the outer filter so a user staying in the same cell is not counted as a "trip."

## Review Notes
- `greatCircleDistance(lon1, lat1, lon2, lat2)` (longitude-first) differs from the new `geoToH3(lat, lon, …)` argument order in ClickHouse ≥ 25.5. Authors writing ClickHouse geo code should be aware of the mixed conventions inside the function library.
- `pointInPolygon` accepts an unclosed polygon (as used in Pattern 2) — ClickHouse closes it automatically; this is documented behavior.
- The bounding-box pre-filter comment (`~0.01 degree ~ 1 km`) is a reasonable rule of thumb at NYC latitude (~0.85 km in longitude, ~1.11 km in latitude per 0.01°); the box is ±0.01°, comfortably wider than the 500 m radius.
- The `neighbor()` function is marked as legacy/deprecated in the ClickHouse docs in favor of window functions, so moving Pattern 6 to `leadInFrame` also aligns the post with current guidance.
- Users on ClickHouse ≤ 25.4 who want to keep the legacy argument/tuple order can set `geotoh3_argument_order = 'lon_lat'` and `h3togeo_lon_lat_result_order = 1`; this is worth mentioning to readers migrating older codebases, but it is outside the scope of the post as written.
