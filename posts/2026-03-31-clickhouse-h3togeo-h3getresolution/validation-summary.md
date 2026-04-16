# Validation Summary: How to Use h3ToGeo() and h3GetResolution() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (v25.5+)
- SQL
- H3 hierarchical geospatial indexing system (Uber H3)
- Geospatial functions: `h3ToGeo`, `h3GetResolution`, `geoToH3`

## Sources Consulted
- ClickHouse H3 functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/geo/h3
- Uber H3 documentation (resolution tables, index format): https://h3geo.org/docs/core-library/restable/
- Python `h3` library v4.4.2 (used to validate H3 index validity and compute cell centers)

## Issues Found

1. **`geoToH3` argument order was outdated.** The post used the old `(lon, lat, resolution)` order, but as of ClickHouse v25.5 the default argument order is `(lat, lon, resolution)`. Updated all `geoToH3` calls (and the source lon/lat subquery columns) to the new order.

2. **H3 index `644325524701716479` is not a valid H3 cell.** Its hex form `0x8f11aa6a3901fff` decodes as a resolution-15 cell but fails H3 cell validation (the H3 library's `cellToLatLng` would error on it). Replaced with `617733151020810239` (valid res 9 cell whose center is approximately `(40.712378, -74.005643)`), and updated the example output accordingly.

3. **H3 index `617733204307009535` is not a valid H3 cell.** Replaced with `599718752904282111` (valid res 5 H3 cell near NYC) so the `h3GetResolution` example produces the advertised `5`.

4. **Resolution 12 area in mermaid diagram was wrong.** The post claimed res 12 is "~0.3m2"; the actual average hexagon area at res 12 is ~307 m². Corrected to "~300m2". (~0.3 m² corresponds to around res 14.)

5. **Sample output for the "Converting H3 Index to Geo" and "Complete Working Example" queries showed hex strings starting with `8a…`.** ClickHouse returns H3 indexes as decimal `UInt64`, and the `8a…` prefix encodes resolution 10, not 9 as the sample claimed. Replaced the hex sample values with correct decimal `UInt64` values computed for those coordinates at res 9 (`617733151020810239`, `617668575952371711`, `617733123812622335`, `617733123959160831`).

## Review Notes

- The `h3ToGeo` return-order note (`(lat, lon)` is the v25.1+ default) matches current ClickHouse documentation, so the post's usage of `tupleElement(..., 1)` for latitude and `tupleElement(..., 2)` for longitude is correct under current defaults.
- Readers on ClickHouse v25.4 or older will need either to swap the argument order for `geoToH3` back to `(lon, lat, resolution)` or set `geotoh3_argument_order = 'lon_lat'`. Similarly, the `h3ToGeo` tuple order is reversed on v24.12 and older unless `h3togeo_lon_lat_result_order = true` is set. Worth adding a brief version note in a future revision.
- H3 resolution-0 cells are described as "~1000km"; this refers to edge length (average ~1107 km), not area. Acceptable as a rough visual scale in the mermaid diagram.
