# Validation Summary: How to Use S2 Geometry Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Google S2 Geometry Library
- S2 functions: geoToS2, s2ToGeo, s2GetNeighbors, s2RectAdd, s2RectUnion, s2RectContains
- H3 (comparison)

## Sources Consulted
- ClickHouse official documentation for S2 geo functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/s2
- ClickHouse official documentation for H3 functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/h3
- Google S2 Geometry Library documentation: https://s2geometry.io/

## Issues Found

1. **`s2RectAdd` signature incorrect (line 60):** Blog described signature as `s2RectAdd(rect, s2_id)` implying 2 arguments. The actual signature is `s2RectAdd(s2PointLow, s2PointHigh, s2Point)` — three separate UInt64 arguments. Fixed the description and added a correct example.

2. **`s2RectUnion` incorrectly used as aggregate function (lines 63–67):** The blog used `s2RectUnion(geoToS2(longitude, latitude))` with GROUP BY, treating it as an aggregate function. `s2RectUnion` is a regular (non-aggregate) function with signature `s2RectUnion(s2Rect1PointLow, s2Rect1PointHigh, s2Rect2PointLow, s2Rect2PointHigh)` — it takes 4 UInt64 arguments representing two rectangles and returns their union. The GROUP BY query would fail. Replaced with a correct example showing proper usage with explicit rectangle coordinates.

3. **`s2RectContains` signature incorrect (lines 72–85):** Blog described signature as `s2RectContains(rect, s2_id)` implying 2 arguments. The actual signature is `s2RectContains(s2PointLow, s2PointHigh, s2Point)` — three separate UInt64 arguments. The SQL example also incorrectly used `s2RectUnion` as an aggregate in a subquery. Fixed description and replaced with a correct example.

4. **S2 hierarchy levels in comparison table (line 109):** Blog stated S2 has "30" hierarchy levels. S2 has levels 0 through 30, which is 31 levels total. Changed to "31".

## Review Notes
- The `geoToS2`, `s2ToGeo`, and `s2GetNeighbors` sections are all correct — argument orders, return types, and examples are accurate.
- The claim that `geoToS2` returns a cell ID at "level 30" (finest resolution) is correct based on S2 library semantics, though ClickHouse docs don't explicitly state the level.
- The H3 comparison values (6 neighbors, 16 levels, hexagonal shape) are all correct.
- The indexing section with MergeTree ORDER BY is a valid and practical approach.
- ClickHouse does not provide a built-in aggregate function for incrementally building S2 bounding rectangles over grouped rows, which limits the GROUP BY pattern the original post was attempting. The corrected examples show the scalar function usage instead.
