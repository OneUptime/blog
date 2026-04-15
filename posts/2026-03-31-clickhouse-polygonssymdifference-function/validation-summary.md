# Validation Summary: How to Use polygonsSymDifference() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse geospatial/polygon functions (`polygonsSymDifferenceCartesian`, `polygonsSymDifferenceSpherical`, `polygonAreaCartesian`, `polygonAreaSpherical`)
- SQL

## Sources Consulted
- ClickHouse official documentation for geo functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/polygon
- ClickHouse source code (`polygonsSymDifference.cpp`, `polygonArea.cpp`) to confirm registered function names

## Issues Found
1. **Incorrect function name `polygonsSymDifference()`**: ClickHouse does not have an unsuffixed `polygonsSymDifference()` function. The actual functions are `polygonsSymDifferenceCartesian()` and `polygonsSymDifferenceSpherical()`. All code examples and prose references were updated to use the correct suffixed variants. The `Cartesian` variant is used for planar coordinate examples and `Spherical` for geographic (lon/lat) coordinate examples.
2. **Incorrect function name `polygonArea()`**: Similarly, ClickHouse does not have an unsuffixed `polygonArea()` function. The actual functions are `polygonAreaCartesian()` and `polygonAreaSpherical()`. The code example and text reference were updated accordingly.

## Review Notes
- The `Array(Array(Tuple(Float64, Float64)))` type recommendation is correct but ClickHouse also provides named type aliases (`Point`, `Ring`, `Polygon`, `MultiPolygon`) which may be more readable.
- The `empty()` check for polygon equality works but `polygonsEqualsCartesian()` / `polygonsEqualsSpherical()` would be a more direct and semantically clear way to check if two polygons are identical.
- The section heading "Combining with polygonArea()" was left unchanged to avoid altering the post structure, though the code and text within it now correctly reference the suffixed function names.
