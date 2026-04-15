# Validation Summary: How to Use polygonArea() and polygonPerimeter() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse geospatial/polygon functions (`polygonAreaCartesian`, `polygonPerimeterCartesian`, `polygonAreaSpherical`, `polygonPerimeterSpherical`)
- Polygon geometry (area, perimeter, compactness ratio)

## Sources Consulted
- ClickHouse official documentation — Polygon functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/polygons
- ClickHouse official documentation — Geometry functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/geometry
- ClickHouse official documentation — Geo data types (Point, Ring, Polygon, MultiPolygon): https://clickhouse.com/docs/en/sql-reference/data-types/geo

## Issues Found

### 1. Incorrect function names throughout the entire post (Critical)
- **What was wrong:** The post used `polygonArea()` and `polygonPerimeter()` throughout. These functions do not exist in ClickHouse. ClickHouse requires a coordinate system suffix on all polygon measurement functions.
- **What was changed:** Replaced all occurrences of `polygonArea()` with `polygonAreaCartesian()` and all occurrences of `polygonPerimeter()` with `polygonPerimeterCartesian()` in titles, descriptions, tags, code examples, and explanatory text.
- **Why:** ClickHouse provides four distinct functions: `polygonAreaCartesian()`, `polygonAreaSpherical()`, `polygonPerimeterCartesian()`, and `polygonPerimeterSpherical()`. There is no unsuffixed variant. Using the names as written in the original post would result in "Unknown function" errors.

### 2. Missing mention of Spherical variants for geographic use cases
- **What was wrong:** The post only described a manual degree-to-kilometer conversion approach for geographic coordinates, and its "For accurate spherical area" suggestion recommended projecting coordinates or using H3 cells — without mentioning the built-in `polygonAreaSpherical()` and `polygonPerimeterSpherical()` functions.
- **What was changed:** Added a mention of the Spherical function variants in the introduction, the geographic coordinates section, and the summary. Updated the recommendation to suggest `polygonAreaSpherical()` as the preferred approach for geographic data.
- **Why:** ClickHouse natively provides spherical variants specifically designed for longitude/latitude coordinates. Not mentioning them when discussing geographic use cases is a significant omission that would lead readers to use a less accurate approximation when a better built-in option exists.

## Review Notes
- The mathematical calculations in the post are correct: a 4x3 rectangle has area 12 and perimeter 14; a 10x10 square with a 4x4 hole has area 84.
- The degree-to-kilometer conversion factor of 12,321 (111^2) for area and 111 for distance is a standard approximation valid near the equator but becomes increasingly inaccurate at higher latitudes. The post appropriately presents this as an approximation.
- The `Array(Array(Tuple(Float64, Float64)))` input format described in the post correctly matches the ClickHouse `Polygon` type definition.
- The isoperimetric compactness ratio formula (area / perimeter^2) is mathematically sound for comparing shape compactness.
