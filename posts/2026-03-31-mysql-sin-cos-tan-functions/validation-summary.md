# Validation Summary: How to Use SIN(), COS(), TAN() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (SIN, COS, TAN, RADIANS, DEGREES, ASIN, ACOS, ATAN, ATAN2, POWER, ROUND, SQRT, PI)
- SQL (stored functions, subqueries, HAVING clause)
- Haversine formula for geographic distance calculation

## Sources Consulted
- MySQL 8.0 Reference Manual — Mathematical Functions: https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html
- Haversine formula derivation and Earth radius constant (6371 km mean radius)
- Independent Python computation to verify all numeric results in the post

## Issues Found
- **Incorrect Haversine distance for London-Paris**: The post claimed the distance from London (51.5074, -0.1278) to Paris (48.8566, 2.3522) was ~341.8 km. Independent computation using the same Haversine formula and coordinates yields ~343.6 km. Changed `~341.8 km` to `~343.6 km`.

## Review Notes
- The `HAVING` clause without `GROUP BY` in the "Finding Nearby Locations" query is a MySQL-specific extension (non-standard SQL). It works in MySQL to filter on column aliases, but would fail in most other SQL databases. This is not an error but is worth noting for portability.
- TAN(RADIANS(45)) is documented as returning `1` but actually returns `0.9999999999999999` due to floating-point representation. The post already uses `~1` for `TAN(PI()/4)` which is the same value, so this is a minor inconsistency — but both are acceptable approximations for a tutorial context.
- The Haversine function uses `ASIN(SQRT(a))` rather than the more numerically stable `ATAN2(SQRT(a), SQRT(1-a))`. For most practical distances this makes no difference, but it could lose precision for antipodal points.
- All other SIN, COS, TAN examples, the Pythagorean identity verification, inverse trig functions, and circular coordinate generation are correct.
