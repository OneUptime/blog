# Validation Summary: How to Use Geo Data Types (Point, Ring, Polygon) in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse Geo data types (Point, Ring, Polygon, MultiPolygon)
- ClickHouse geo functions (greatCircleDistance, greatCircleAngle, pointInPolygon)
- SQL (CREATE TABLE, INSERT, SELECT)
- MergeTree engine

## Sources Consulted
- ClickHouse Geo data types docs: https://clickhouse.com/docs/sql-reference/data-types/geo
- ClickHouse Geographical Coordinates functions: https://clickhouse.com/docs/sql-reference/functions/geo/coordinates
- ClickHouse Geo polygons functions: https://clickhouse.com/docs/sql-reference/functions/geo/polygon

## Issues Found

1. **Coordinate order inconsistency (Point description).** The post originally described `Point` as `(longitude, latitude)` in both the overview table and the "Working with Point" section, but every `INSERT` and `SELECT` in the post treats tuple element 1 as latitude and element 2 as longitude (e.g., New York inserted as `(40.7128, -74.0060)`, and `location.1 AS latitude, location.2 AS longitude`). This contradicts the stated convention.
   - **Fix:** Updated the overview table to describe `Point` as "A pair of Float64 coordinates (order is up to you)" since ClickHouse's `Point` is just a generic `Tuple(Float64, Float64)` with no enforced axis order. Updated the "Working with Point" intro to explicitly note that this post stores values as `(latitude, longitude)` and that geo functions like `greatCircleDistance` expect `(longitude, latitude)` — which is why the existing code passes `location.2, location.1` to those functions. This keeps the existing code samples correct and resolves the contradiction.

2. **Incorrect `wkt` function reference.** The Geo Functions Reference section claimed there is a `wkt` function ("Well-Known Text representation") available in ClickHouse 22.x+. ClickHouse does not expose a single `wkt()` output function; it provides parsing functions (`readWKTPoint`, `readWKTRing`, `readWKTPolygon`, `readWKTMultiPolygon`) to read WKT strings into geo types.
   - **Fix:** Replaced the `wkt` reference with the correct `readWKT*` parsing functions and an example `SELECT readWKTPoint('POINT(-73.9857 40.7484)');`.

## Review Notes
- The `SET allow_experimental_geo_types = 1;` line is kept — geo types became stable around ClickHouse 22.x and the setting is no longer required, but the inline comment ("required in some versions") already qualifies it correctly for older deployments.
- `greatCircleDistance(lon1, lat1, lon2, lat2)` signature and meter return units are verified.
- `pointInPolygon((x, y), ring_or_polygon)` accepts either a Ring or Polygon (array of rings with optional holes) as the second argument — the post's usage is valid in both forms.
- `greatCircleAngle` signature and degree return units are verified.
- For higher accuracy on real geodesic distances, `geoDistance` (WGS-84 ellipsoid) is an alternative to `greatCircleDistance` (spherical) — not a correctness issue, just worth noting for future expansion.
