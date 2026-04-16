# Validation Summary: How to Use geoDistance() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse geospatial functions: `geoDistance()`, `greatCircleDistance()`
- ClickHouse utility functions: `arrayJoin()`, `groupArray()`, `neighbor()`, `round()`, `abs()`, `today()`
- WGS-84 reference ellipsoid / geodesic concepts

## Sources Consulted
- ClickHouse official docs — Geographical Coordinates functions: https://clickhouse.com/docs/sql-reference/functions/geo/coordinates (covers `geoDistance`, `greatCircleDistance` syntax, argument order, return type, and accuracy notes)
- ClickHouse documentation on `arrayJoin`, `neighbor`, and `groupArray` aggregate/array functions

## Issues Found
1. **Overstated accuracy claim.** The introduction said `geoDistance()` has "errors below 0.5 mm over any distance." This level of accuracy is characteristic of Vincenty's / Karney's geodesic algorithms, not ClickHouse's implementation. The ClickHouse docs state that `geoDistance` "for close enough points … calculate[s] the distance using planar approximation with the metric on the tangent plane at the midpoint of the coordinates" and describe it only as "a more precise approximation of the Earth Geoid." Updated the wording to reflect the actual algorithm and omit the sub-mm claim.

2. **Summary repeated the same overstatement.** The summary claimed "sub-millimeter accuracy versus the sphere approximation." Rewrote to describe it as a more precise approximation of the Earth geoid without quantifying an unsupported accuracy figure.

3. **Incorrect performance comparison.** The Performance Comparison section's comment read: "geoDistance is slightly slower than greatCircleDistance due to ellipsoid math but the difference is typically <20% for pure compute." The official ClickHouse docs explicitly state: "The performance is the same as for `greatCircleDistance` (no performance drawback)." Updated the comment and summary to reflect this.

## Review Notes
- Function signature `geoDistance(lon1Deg, lat1Deg, lon2Deg, lat2Deg)` and the `(lon, lat)` argument order are correct per ClickHouse docs.
- Return type (`Float64`, meters) and use of the WGS-84 ellipsoid are accurately represented.
- `neighbor()` is still available but is discouraged in newer ClickHouse in favor of window functions (`lagInFrame`/`leadInFrame`). It works for the illustrative example here; future revisions may want to modernize this example.
- The sample numeric outputs (e.g., Sydney–Buenos Aires, per-degree-longitude table) are plausible illustrative values; they were not independently reproduced against a running ClickHouse instance but are within the expected order of magnitude for the given coordinates.
- The remaining SQL examples are syntactically valid ClickHouse and reference standard functions correctly.
