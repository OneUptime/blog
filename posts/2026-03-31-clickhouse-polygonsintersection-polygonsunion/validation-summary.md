# Validation Summary: How to Use polygonsIntersection() and polygonsUnion() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse geospatial/polygon functions (polygonsIntersectionCartesian, polygonsIntersectionSpherical, polygonsUnionCartesian, polygonsUnionSpherical)
- pointInPolygon()
- SQL

## Sources Consulted
- ClickHouse official documentation — Polygon functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/polygons
- ClickHouse official documentation — pointInPolygon: https://clickhouse.com/docs/en/sql-reference/functions/geo/coordinates#pointinpolygon

## Issues Found

### 1. Non-existent function names
**What was wrong:** The post used `polygonsIntersection()` and `polygonsUnion()` throughout. These function names do not exist in ClickHouse. Only the suffixed variants exist: `polygonsIntersectionCartesian()` / `polygonsIntersectionSpherical()` and `polygonsUnionCartesian()` / `polygonsUnionSpherical()`.
**What was changed:** All function references in code examples and prose were updated to use the Cartesian variants, and the intro/summary mention both Cartesian and Spherical variants.

### 2. Wrong polygon nesting level in literal examples
**What was wrong:** The literal polygon examples used double-nested arrays `[[(x, y), ...]]` (Polygon format), but the polygon set-operation functions accept triple-nested arrays `[[[(x, y), ...]]]` (MultiPolygon format) per the official documentation examples.
**What was changed:** All literal polygon arguments in the `polygonsIntersectionCartesian()` and `polygonsUnionCartesian()` code examples were updated to use the correct MultiPolygon format with triple nesting.

### 3. Incorrect type description
**What was wrong:** The post described the input type as `Array(Array(Tuple(Float64, Float64)))` (Polygon), but the functions accept `Array(Array(Array(Tuple(Float64, Float64))))` (MultiPolygon).
**What was changed:** Updated the Polygon Representation section to clarify the difference between Polygon and MultiPolygon types, and that the set-operation functions accept MultiPolygon inputs.

### 4. Fragile overlap check pattern
**What was wrong:** The overlap check used `length(result[1]) > 0`, which indexes into the MultiPolygon result to get the first polygon and checks its ring count. For an empty intersection, accessing index `[1]` on an empty array relies on ClickHouse's default-value behavior. The more robust and idiomatic check is `length(result) > 0` to see if the MultiPolygon contains any polygons at all.
**What was changed:** Changed `length(polygonsIntersection(...)[1]) > 0` to `length(polygonsIntersectionCartesian(...)) > 0` in both the delivery zones and campaign examples.

## Review Notes
- The post title and metadata still reference the generic `polygonsIntersection()` / `polygonsUnion()` names for discoverability, but the body now correctly uses the actual ClickHouse function names.
- The `pointInPolygon()` usage in the Performance Considerations section is syntactically correct per the official docs.
- The table-based examples (delivery zones, branches, campaigns) reference column names whose types depend on the table schema. These are conceptual examples and are correct assuming the columns store MultiPolygon data.
