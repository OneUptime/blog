# Validation Summary: How to Use geohashEncode() and geohashDecode() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- Geohash spatial indexing system
- ClickHouse geospatial functions: `geohashEncode`, `geohashDecode`, `geohashesInBox`
- ClickHouse MergeTree engine (materialized columns, partitioning, sort keys)

## Sources Consulted
- ClickHouse Geo Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/geo/geohash
- Standard geohash precision-to-cell-size reference (from Niemeyer's geohash.org spec)

## Issues Found
No technical issues found.

Verification details:
- `geohashEncode(longitude, latitude, precision)` signature matches ClickHouse docs (longitude first, then latitude, optional precision in range [1, 12]).
- `geohashDecode(hash)` returns a `Tuple(Float64, Float64)` of `(longitude, latitude)` — matches blog's tuple-access syntax `.1` for lon, `.2` for lat.
- `geohashesInBox(longitude_min, latitude_min, longitude_max, latitude_max, precision)` parameter order is correct in the blog's example and comments.
- Precision-to-cell-size approximations (~5000 km at precision 1, ~39 km × 20 km at 4, ~1.2 km × 0.6 km at 6, ~38 m × 19 m at 8, ~3.7 cm × 1.9 cm at 12) all match standard geohash cell dimensions.
- The San Francisco coordinate `(-122.4194, 37.7749)` encoding to a prefix of `9q8yy...` is correct.
- MATERIALIZED column syntax, MergeTree `PARTITION BY` / `ORDER BY` clauses, and `substring()` hierarchy navigation are all valid ClickHouse SQL.
- Claim that "a geohash of precision N is the prefix of a geohash of precision N+1" (for the same point) is correct — geohashes are hierarchical.
- Claim that adjacent cells may not share a prefix is correct (cells straddling subdivision boundaries).

## Review Notes
- The statement "Two locations sharing the same geohash prefix are guaranteed to be nearby" is generally true for same-length prefixes, but geohashes have discontinuities at the antimeridian and at equatorial/polar boundaries where geometrically-close points can differ in prefix. The blog's follow-up section on `geohashesInBox()` correctly acknowledges the adjacency caveat.
- The ClickHouse docs note that precision values outside [1, 12] are "silently converted to 12" — the blog doesn't mention this edge case, but doesn't need to for a tutorial at this scope.
- The decoded center coordinates shown in the output block are illustrative; exact values depend on cell boundaries but the shown values are plausible for the San Francisco reference point.
