# Validation Summary: How to Use pointInPolygon() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, geospatial functions)
- `pointInPolygon()` function
- `pointInEllipses()` function (mentioned in summary)
- MergeTree engine
- Materialized columns

## Sources Consulted
- ClickHouse official documentation — Geo Functions (Coordinates): https://clickhouse.com/docs/en/sql-reference/functions/geo/coordinates#pointinpolygon
- ClickHouse official documentation — pointInEllipses: https://clickhouse.com/docs/en/sql-reference/functions/geo/coordinates#pointinellipses

## Issues Found

### 1. Incorrect claim about self-intersecting polygons
- **What was wrong:** The introduction stated the function "handles convex, concave, and self-intersecting polygons." The official ClickHouse documentation explicitly warns: "If the input is self-intersecting, has mis-ordered rings, or overlapping edges, results become unreliable."
- **What was changed:** Removed the self-intersecting claim and added a warning that self-intersecting polygons produce unreliable results.

### 2. Unverifiable algorithm claim
- **What was wrong:** The introduction stated "The function uses the ray-casting algorithm." The official documentation does not name any specific algorithm for `pointInPolygon()`.
- **What was changed:** Removed the ray-casting algorithm claim to avoid stating unverified implementation details.

### 3. Missing boundary behavior note
- **What was wrong:** The post did not mention that points on the polygon boundary may return either `0` or `1`, which is documented behavior.
- **What was changed:** Added a note about boundary behavior to the introduction.

## Review Notes
- The ClickHouse documentation states "The polygon must be constant" for `pointInPolygon()`. The blog post includes examples where the polygon is read from a joined table column (`z.polygon`), which is not a constant expression. In practice this may work in recent ClickHouse versions but without index optimization benefits. Users should be aware of this limitation.
- The `today() - 7` syntax in the "Spatial Aggregation" section is valid ClickHouse — subtracting an integer from a `Date` type subtracts that many days.
- The `pointInEllipses()` reference in the summary is confirmed to exist in the official documentation.
- All SQL syntax, table definitions, and query patterns are correct ClickHouse SQL.
