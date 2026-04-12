# Validation Summary: How to Use ST_AsText() and ST_AsBinary() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- Well-Known Text (WKT) format
- Well-Known Binary (WKB) format
- GeoJSON format
- SRID 4326 (WGS 84) coordinate reference system
- OGC spatial standards

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Function Reference — https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual: ST_AsText / ST_AsWKT — https://dev.mysql.com/doc/refman/8.0/en/gis-format-conversion-functions.html
- MySQL 8.0 Reference Manual: ST_AsBinary / ST_AsWKB — https://dev.mysql.com/doc/refman/8.0/en/gis-format-conversion-functions.html
- MySQL 8.0 Reference Manual: ST_GeomFromText — https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0 Reference Manual: Spatial Reference Systems — https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- OGC Simple Feature Access specification (WKT/WKB format definitions)
- EPSG:4326 (WGS 84) axis order definition — latitude first, longitude second
- RFC 7946: The GeoJSON Format — https://datatracker.ietf.org/doc/html/rfc7946

## Issues Found

### 1. SRID 4326 coordinate axis order was reversed (all WKT examples)
**What was wrong:** All `POINT()` and `POLYGON()` WKT literals used (longitude, latitude) order, but SRID 4326 (WGS 84) in MySQL 8.0.12+ uses the SRS-defined axis order of (latitude, longitude). For example, the Eiffel Tower was written as `POINT(2.2945 48.8584)` which MySQL would interpret as latitude=2.2945, longitude=48.8584 — placing the point in the ocean off Africa rather than in Paris. The Mermaid diagram also explicitly labeled the format as `POINT(lon lat)`.

**What was changed:** Swapped all coordinate pairs to (latitude, longitude) order:
- Eiffel Tower: `POINT(2.2945 48.8584)` → `POINT(48.8584 2.2945)`
- Big Ben: `POINT(-0.1246 51.5007)` → `POINT(51.5007 -0.1246)`
- Colosseum: `POINT(12.4922 41.8902)` → `POINT(41.8902 12.4922)`
- NYC Zone polygon: `POLYGON((-74.02 40.70, ...))` → `POLYGON((40.70 -74.02, ...))`
- Updated the Mermaid diagram to say `POINT(lat lon)`
- Updated all WKT output tables, the WHERE clause LIKE pattern, and the summary text to match

**Why:** MySQL 8.0.12+ interprets WKT coordinates according to the SRS axis order. SRID 4326 defines axis order as (Latitude, Longitude) per the EPSG standard. Using (longitude, latitude) stores semantically incorrect geographic locations. The GeoJSON output section (which uses [longitude, latitude] per RFC 7946) was already correct for the intended locations, confirming the coordinates were simply in the wrong order in the WKT.

### 2. WKB hex values were incorrect (wrong length and wrong bytes)
**What was wrong:** The `HEX(ST_AsBinary())` output showed 40 hex characters (20 bytes) per point, but WKB format for a Point requires exactly 42 hex characters (21 bytes): 1 byte byte-order + 4 bytes type + 8 bytes first coordinate + 8 bytes second coordinate. The Y coordinate was missing its final byte in both rows. Additionally, decoding the existing hex bytes showed they did not match the coordinate values (e.g., the first double decoded to ~2.256 rather than the expected value).

**What was changed:** Replaced both WKB hex values with correctly computed IEEE 754 doubles packed in little-endian WKB format:
- Eiffel Tower: `010100000070CE88D2DE0B024023DBDE02098448` → `010100000076711B0DE06D48404260E5D0225B0240`
- Big Ben: `0101000000D7A3703D0ACF3FBF000000A05D4940` → `0101000000B98D06F016C04940BDE3141DC9E5BFBF`

**Why:** The original hex strings were fabricated/approximate values that were not valid WKB. Correct WKB must be exactly 21 bytes for a Point and must contain properly encoded IEEE 754 doubles matching the stored coordinate values.

## Review Notes
- The `ST_AsBinary()` output axis order for geographic SRS depends on the MySQL version and the `axis-order` option (available from MySQL 8.0.12+). The default is `srid-defined`, which uses (latitude, longitude) for SRID 4326. The corrected WKB hex values assume this default behavior.
- Function names and aliases (`ST_AsText`/`ST_AsWKT`, `ST_AsBinary`/`ST_AsWKB`) are correctly documented.
- The SQL syntax for table creation with `SRID 4326` column constraints is correct for MySQL 8.0.
- The GeoJSON output format shown is correct per RFC 7946 (coordinates in [longitude, latitude] order regardless of SRS axis order).
- The best practices section gives sound advice, particularly about using `ST_Equals` instead of string comparison on WKT output.
