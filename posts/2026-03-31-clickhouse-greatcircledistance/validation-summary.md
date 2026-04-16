# Validation Summary: How to Use greatCircleDistance() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL geospatial functions)
- `greatCircleDistance()` function
- `geoDistance()` function (comparison)
- `neighbor()` window function
- `today()` date function

## Sources Consulted
- ClickHouse official docs — Geo coordinate functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/coordinates
- ClickHouse source: `src/Functions/greatCircleDistance.cpp` on GitHub (implementation details for sphere radius, algorithm, return type)
- Great-circle distance / Haversine formula references (Wikipedia)

## Issues Found
1. **Sphere radius stated as 6,371,000 m.** ClickHouse actually uses the WGS84 authalic radius `6,371,007.180918475 m` (for consistency with the H3 library). Fixed the intro paragraph to state this accurately.
2. **Return type stated as `Float64`.** The ClickHouse implementation returns `Float32` by default; it only returns `Float64` when all arguments are `Float64` AND the setting `geo_distance_returns_float64_on_float64_arguments` is enabled. Fixed the intro paragraph to reflect this.
3. **"Uses the Haversine formula internally" was an oversimplification.** The actual implementation uses a flat-ellipsoid tangent-plane approximation for nearby points (longitude difference < ~13°) and Haversine for more distant ones. Clarified in the intro paragraph.

Also added explicit argument range information (`[-180°, 180°]` for longitude, `[-90°, 90°]` for latitude) which matches the official docs.

## Review Notes
- The NY→London example output (`5570224.98` m → `5570.2` km) is consistent with the Haversine formula using ClickHouse's WGS84 authalic radius.
- The SF→LA example (`559.1` km) is consistent as well.
- Code examples are syntactically valid ClickHouse SQL and use real, non-deprecated functions (`neighbor`, `today`, `round`, `CROSS JOIN`, etc.).
- The `neighbor(column, 1)` pattern in the GPS-track example assumes per-vehicle ordering — in practice you would want to ensure rows are sorted by `(vehicle_id, event_time)` (e.g., via a pre-ordered source or a subquery with `ORDER BY`), because `neighbor()` operates on block-level physical row order, not logical ordering. Not strictly wrong (this is how people typically demonstrate it), but worth keeping in mind.
- Argument order `(lon, lat)` is correctly emphasized — this is a common pitfall and the post addresses it well.
- The claim that `geoDistance()` accounts for Earth's ellipsoidal (WGS-84) shape is accurate.
