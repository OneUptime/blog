# Validation Summary: How to Use polygonsWithin() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse geospatial/polygon functions (`polygonsWithinCartesian`, `polygonsWithinSpherical`)
- ClickHouse `pointInPolygon` function

## Sources Consulted
- ClickHouse official documentation: Functions for Working with Polygons — https://clickhouse.com/docs/sql-reference/functions/geo/polygons
- ClickHouse official documentation: Geometric Data Types — https://clickhouse.com/docs/sql-reference/data-types/geo
- ClickHouse source code: `src/Functions/polygonsWithin.cpp` — https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/polygonsWithin.cpp

## Issues Found

### 1. Non-existent function name `polygonsWithin()`
**What was wrong:** The entire post referenced a bare `polygonsWithin()` function, which does not exist in ClickHouse. ClickHouse only provides `polygonsWithinCartesian()` (for flat/projected coordinate systems) and `polygonsWithinSpherical()` (for geographic longitude/latitude coordinates). Calling `polygonsWithin()` would produce an "unknown function" error.

**What was changed:** 
- Updated the title, tags, and description to reference both `polygonsWithinCartesian()` and `polygonsWithinSpherical()`.
- Added a note explaining that there is no bare `polygonsWithin()` function.
- Updated the function signature section to show both variants.
- Changed the basic Cartesian example to use `polygonsWithinCartesian()`.
- Changed all real-world geographic examples (delivery zones, region hierarchy, district coverage) to use `polygonsWithinSpherical()`, since they deal with geographic coordinates.
- Updated the summary to cover both variants with guidance on when to use each.

**Why:** The ClickHouse source code registers exactly two function names — `polygonsWithinCartesian` and `polygonsWithinSpherical`. There is no generic/unsuffixed version. This was confirmed via the ClickHouse source code and official documentation.

### 2. Missing multi-polygon type in function signature section
**What was wrong:** The original post only mentioned `Array(Array(Tuple(Float64, Float64)))` (Polygon type) as the argument type, but the functions also accept `Array(Array(Array(Tuple(Float64, Float64))))` (MultiPolygon type).

**What was changed:** Added the MultiPolygon type to the function signature description.

**Why:** The ClickHouse documentation and source code confirm both Polygon and MultiPolygon are accepted argument types.

## Review Notes
- The `pointInPolygon()` function referenced in the "Combining with pointInPolygon" section is a valid ClickHouse function and is used correctly.
- The basic example's polygon coordinates and expected result (1) are correct — a square from (2,2) to (8,8) is indeed fully contained within a square from (0,0) to (10,10).
- These functions were introduced in ClickHouse 21.4. The post does not mention version requirements, which is acceptable since this version is widely deployed.
- The performance tips are reasonable general advice, though `ORDER BY` keys do not directly accelerate polygon containment checks — they help with general query filtering that might precede the spatial operation.
