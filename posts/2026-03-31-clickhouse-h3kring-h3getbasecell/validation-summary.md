# Validation Summary: How to Use h3kRing() and h3GetBaseCell() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- Uber H3 (hexagonal hierarchical geospatial indexing system)
- SQL (ClickHouse dialect)
- ClickHouse H3 functions: `h3kRing`, `h3GetBaseCell`, `geoToH3`, `h3Distance`

## Sources Consulted
- ClickHouse official H3 function reference: https://clickhouse.com/docs/sql-reference/functions/geo/h3
- Uber H3 base cell specification (122 base cells at resolution 0, of which 12 are pentagons)
- H3 k-ring cardinality formula `3k² + 3k + 1` (standard hexagonal grid mathematics)

## Issues Found
- **`geoToH3` argument order was incorrect for current ClickHouse.** All four code examples used `geoToH3(longitude, latitude, resolution)`. In ClickHouse v25.5 and later, the documented signature is `geoToH3(lat, lon, resolution)` — the order was flipped. The coordinates in the examples (37.6156, 55.7522) correspond to Moscow (lat 55.7522°N, lon 37.6156°E), so the original post was using `(lon, lat)` order. I swapped the arguments in all five call sites (three SELECTs referencing Moscow, one placeholder example using `longitude, latitude` column names, and the combined-functions example) to match the current ClickHouse signature.

## Review Notes
- `h3kRing`, `h3GetBaseCell`, and `h3Distance` all exist in ClickHouse with the signatures used in the post. ClickHouse retains the legacy H3 v3 naming (`h3kRing`) rather than the newer H3 v4 name (`gridDisk`), so the post's naming is correct for ClickHouse.
- The 122 base cells claim and the `3k² + 3k + 1` ring-size formula are both correct. Minor caveat the author omits: k-rings that include one of the 12 pentagon base cells return one fewer cell (pentagons have only 5 neighbors), but this is a niche edge case.
- Users on ClickHouse ≤ v25.4 would need the legacy `(lon, lat)` order or the setting `geotoh3_argument_order = 'lon_lat'`. The post does not mention this; readers on older versions should consult the docs for their version.
