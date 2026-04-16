# Validation Summary: How to Use h3GetResolution() and h3EdgeLengthM() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- H3 hierarchical geospatial indexing system
- ClickHouse H3 functions: `h3GetResolution`, `h3EdgeLengthM`, `h3EdgeLengthKm`, `geoToH3`, `h3CellAreaM2`, `h3ToParent`, `h3kRing`

## Sources Consulted
- ClickHouse H3 functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/geo/h3
- Uber H3 library resolution table: https://h3geo.org/docs/core-library/restable/

## Issues Found
- The H3 resolution overview table labeled its second column "Approximate Cell Diameter", but the listed values (~1,107 km at res 0, ~174 m at res 9, etc.) are actually H3's *average hexagon edge lengths*, not cell diameters (which would be ~2× the edge length for a regular hexagon). Renamed the column to "Approximate Edge Length" to match H3/ClickHouse terminology. Also corrected the res 6 entry from ~3.7 km to ~3.2 km to match the published ~3.229 km value.
- The final example used `h3KRing` (uppercase K). While ClickHouse function names are case-insensitive, the canonical ClickHouse function name is `h3kRing` (lowercase k). Updated to the canonical spelling.

## Review Notes
- All referenced ClickHouse H3 functions (`h3GetResolution`, `h3EdgeLengthM`, `h3EdgeLengthKm`, `geoToH3`, `h3CellAreaM2`, `h3ToParent`, `h3kRing`) exist and are used with the correct signatures.
- The edge length values in the `h3EdgeLengthM()` output block (1107712.59, 59810.85, 3229.48, 174.38, 9.42, 0.51) match the H3 library's published averages.
- Note for future maintenance: H3 v4 renamed `kRing` to `gridDisk`, but ClickHouse retains the v3-style `h3kRing` name. If ClickHouse ever introduces the v4 naming, this post may need updating.
