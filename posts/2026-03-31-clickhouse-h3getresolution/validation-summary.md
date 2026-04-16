# Validation Summary: How to Use h3GetResolution() in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (SQL)
- Uber H3 hexagonal geospatial indexing
- ClickHouse H3 functions: `h3GetResolution`, `geoToH3`, `h3ToGeo`, `h3ToParent`, `h3IsValid`
- ClickHouse aggregate / window functions: `countIf`, `groupUniqArray`, `sum() OVER ()`

## Sources Consulted
- [ClickHouse H3 function reference](https://clickhouse.com/docs/en/sql-reference/functions/geo/h3)
- [ClickHouse changelog notes for v25.1 (`h3ToGeo` return order change) and v25.5 (`geoToH3` argument order change)]
- Sibling post `posts/2026-03-31-clickhouse-h3togeo-geotoh3/` (already validated) for established conventions on the v25.1/v25.5 argument/return-order changes

## Issues Found

The post used the legacy `(lon, lat)` convention for `geoToH3()` arguments and the legacy `(lon, lat)` interpretation of the `h3ToGeo()` return tuple. Both were changed in recent ClickHouse releases (v25.5 and v25.1 respectively), so the queries as written would silently produce incorrect H3 indexes / mis-labeled coordinates against modern ClickHouse.

1. **`geoToH3()` argument order in the Basic Usage section.** Changed `geoToH3(-122.4194, 37.7749, 5)` and `geoToH3(-122.4194, 37.7749, 9)` (and the wrapped `h3GetResolution(geoToH3(...))` calls) to `geoToH3(37.7749, -122.4194, 5)` / `geoToH3(37.7749, -122.4194, 9)` so that the latitude (37.7749) is the first argument per current ClickHouse semantics. The expected H3 index values (`599686042433355775`, `617700169958293503`) remain valid since they correspond to the same San Francisco point.

2. **`geoToH3()` argument order in the Verifying geoToH3() Output Resolution section.** Changed `geoToH3(lon, lat, 9)` to `geoToH3(lat, lon, 9)` so the inner subquery's `lat` column is passed first. The subquery aliases (`longitude AS lon`, `latitude AS lat`) were left intact since they are still descriptive of the source columns.

3. **`h3ToGeo()` tuple return order in the Filtering by Resolution Range section.** Swapped the labels `h3ToGeo(h3_index).1 AS lon, h3ToGeo(h3_index).2 AS lat` to `h3ToGeo(h3_index).1 AS lat, h3ToGeo(h3_index).2 AS lon` to match the current `(lat, lon)` return tuple.

4. **Version compatibility note added.** Added a short paragraph after the intro pointing out the v25.1 / v25.5 behavior change and the `geotoh3_argument_order = 'lon_lat'` / `h3togeo_lon_lat_result_order = 1` settings that restore legacy behavior. This matches the convention used in the validated sibling post and prevents readers on older ClickHouse from being confused.

## Review Notes
- `h3GetResolution()` itself is unaffected by the v25.1 / v25.5 changes — it operates purely on the bit layout of the `UInt64` index, which is the standard H3 binary format. The return type (`UInt8`) and value range (0-15) are correctly described.
- The CASE/`countIf`/`groupUniqArray`/window-function (`sum() OVER ()`) usages are syntactically valid ClickHouse SQL.
- The `h3IsValid()` and `h3ToParent()` references use the current function names and signatures.
- The example H3 index values (`599686042433355775` for SF at res 5 and `617700169958293503` for SF at res 9) match those used in the already-validated sibling post `2026-03-31-clickhouse-h3togeo-geotoh3` and are plausible H3 indexes for that area; the bit layout for resolution does match the labeled `res_5`/`res_9` outputs.
