# Validation Summary: How to Use atan2() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- Math functions (`atan2`, `atan`, `pi`, `sin`, `cos`, `sqrt`, `round`, `mod`, `degrees`)
- Trigonometry / geospatial (compass bearing, great-circle initial bearing)
- 2D vector analysis (direction of motion, signed angle between vectors)

## Sources Consulted
- ClickHouse math functions reference: https://clickhouse.com/docs/en/sql-reference/functions/math-functions (verified `atan2`, `pi`, `degrees`)
- ClickHouse arithmetic functions reference: https://clickhouse.com/docs/en/sql-reference/functions/arithmetic-functions#modulo (verified `mod` as alias for `modulo`)
- ClickHouse SELECT ... WITH clause reference: https://clickhouse.com/docs/en/sql-reference/statements/select/with (verified correct `WITH <expr> AS <identifier>` syntax)
- Standard great-circle initial-bearing formula (Ed Williams' Aviation Formulary; cross-referenced with movable-type.co.uk/scripts/latlong.html)

## Issues Found
1. **Incorrect `WITH` clause syntax in "Angle Between Two Vectors" example.** The post used `WITH ax AS 1.0, ay AS 0.0, bx AS 0.0, by AS 1.0`, which reverses the ClickHouse syntax. The correct form is `WITH <expression> AS <identifier>` (expression first). Changed to `WITH 1.0 AS a_x, 0.0 AS a_y, 0.0 AS b_x, 1.0 AS b_y`.
2. **`by` is a reserved keyword in ClickHouse** (used in `GROUP BY`, `ORDER BY`, `PARTITION BY`). Using it as an unquoted identifier causes parse errors. Renamed the four CTE identifiers to `a_x`, `a_y`, `b_x`, `b_y` and updated the `atan2(...)` call accordingly so the example now parses and evaluates correctly (the 90° canonical test case still yields `90.0`).

## Review Notes
- The `atan2(y, x)` signature, argument order, return type (Float64 in radians), and output range `(-pi, pi]` are all consistent with the ClickHouse documentation.
- The basic-quadrant verification query (`atan2(1,1)` → 45°, `atan2(1,-1)` → 135°, `atan2(-1,-1)` → -135°, `atan2(-1,1)` → -45°, `atan2(1,0)` → 90°, `atan2(0,-1)` → 180°) is mathematically correct.
- The great-circle initial-bearing formula in the compass-bearing section matches the standard formulation: `θ = atan2(sin(Δλ)·cos(φ₂), cos(φ₁)·sin(φ₂) − sin(φ₁)·cos(φ₂)·cos(Δλ))`.
- The math→compass conversion `(90 - atan2(vy, vx)·180/π) mod 360` is correct for the convention where `vy` points north and `vx` points east.
- The signed angle formula `atan2(a_x·b_y − a_y·b_x, a_x·b_x + a_y·b_y)` is the standard cross-product / dot-product formulation and returns positive values for counterclockwise rotation as stated.
- The pseudocode `bearing = (degrees(atan2(delta_lon, delta_lat)) + 360) % 360` references `degrees()` which exists in ClickHouse — this pseudocode simplification is only strictly valid near the equator; the post correctly uses the full great-circle formula in the actual SQL.
