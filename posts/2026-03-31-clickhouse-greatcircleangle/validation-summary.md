# Validation Summary: How to Use greatCircleAngle() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL function `greatCircleAngle`)
- ClickHouse geographic functions (`greatCircleDistance`, `geoDistance`)
- ClickHouse window-like function (`neighbor`)
- ClickHouse aggregate functions (`argMin`, `min`)
- Spherical geometry / Haversine formula
- Astronomy (celestial RA/Dec coordinates)

## Sources Consulted
- ClickHouse official documentation, geographic coordinate functions: https://clickhouse.com/docs/en/sql-reference/functions/geo/coordinates
- ClickHouse source for `greatCircleDistance` / `greatCircleAngle` (Haversine-based implementation with lookup-table approximation)
- Standard Haversine formula references (computed independently to verify numeric claims)
- SIMBAD / standard astronomy references for Betelgeuse (α Ori) and Bellatrix (γ Ori) J2000 coordinates

## Issues Found

1. **NYC–London angular result was numerically wrong.** The post claimed `greatCircleAngle(-74.0060, 40.7128, -0.1276, 51.5074)` returns `49.9` degrees. Using the Haversine formula with R = 6,371,000 m (which matches ClickHouse's implementation) the correct value is ≈ 50.09°. The post's own verification step (`distance_m = 5570224.98`) also pointed to the correct angle: `5570224.98 / (π/180 × 6371000) ≈ 50.094°`, so `49.9` contradicted the accompanying distance. Fixed both code-block outputs to show `50.09`.

2. **Betelgeuse / Bellatrix coordinates and separation were incorrect.** The post used RA/Dec `(83.8221, 5.3911)` for Betelgeuse and `(78.6345, 5.4084)` for Bellatrix, with result `4.97°`. The real J2000 coordinates are Betelgeuse = `(88.7929, 7.4071)` and Bellatrix = `(81.2828, 6.3497)`, and the well-known angular separation is ≈ 7.5°. Additionally, the reported `4.97°` did not even match the (incorrect) coordinates given — computing the Haversine for the post's coords yields ≈ 5.16°, not 4.97°. Replaced with real coordinates and updated the result to `7.53`.

## Review Notes

- The function signature `greatCircleAngle(lon1, lat1, lon2, lat2)` and its return (degrees, `Float64`, 0–180) are correct and match the official documentation.
- The relationship `greatCircleDistance ≈ greatCircleAngle × (π/180) × 6,371,000` is conceptually correct; note that ClickHouse uses an approximated implementation (lookup-table / bilinear interpolation), so the displayed `distance_m` and `derived_distance_m` can differ by fractions of a meter due to rounding and internal approximations. The values shown are within expected tolerance.
- The antipodal example uses `(106.0, -40.7128)` which is not exactly antipodal to `(-74.0060, 40.7128)` (the exact antipode longitude is `105.994`). The deviation (~0.006°) is negligible and the displayed `180.0` is correct to 1 decimal place.
- The `neighbor()` example relies on the processing order of rows, which is sensitive to query structure. For production use, adding an explicit `ORDER BY` in a subquery before applying `neighbor()` is the safer pattern, but the snippet is acceptable as an illustrative example.
- The clustering example using `CROSS JOIN` + `argMin`/`min` is syntactically and semantically correct in ClickHouse.
