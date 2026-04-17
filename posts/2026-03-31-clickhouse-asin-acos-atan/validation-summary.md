# Validation Summary: How to Use asin(), acos(), atan() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- ClickHouse math functions: `asin()`, `acos()`, `atan()`, `atan2()`, `sin()`, `cos()`, `sqrt()`, `pow()`, `pi()`, `nullIf()`
- ClickHouse `arrayJoin()` and tuple element access
- ClickHouse CTE / `WITH` clause
- Trigonometry / haversine great-circle distance

## Sources Consulted
- ClickHouse math functions: https://clickhouse.com/docs/en/sql-reference/functions/math-functions
- ClickHouse `arrayJoin`: https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse `WITH` clause: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse `Tuple` data type / element access: https://clickhouse.com/docs/en/sql-reference/data-types/tuple
- ClickHouse SQL syntax / keywords: https://clickhouse.com/docs/en/sql-reference/syntax

## Issues Found
1. **Incorrect `WITH` clause syntax in the "Computing the Angle Between Two Vectors" example.** The post used `WITH ax AS 1.0, ay AS 0.0, bx AS 0.7071, by AS 0.7071`, which inverts the ClickHouse scalar-CTE syntax. The documented form is `WITH <expression> AS <identifier>`, e.g. `WITH '2019-08-01 15:23:00' AS ts_upper_bound`. Fixed by reversing each pair to `1.0 AS ax, 0.0 AS ay, 0.7071 AS bx, 0.7071 AS by_v`.
2. **Identifier `by` collides with the `BY` keyword.** While the lexer accepts it in some positions, it is fragile and confusing. Renamed to `by_v` (and updated all references in the dot-product expression).
3. **Multiple `arrayJoin()` calls in the same `SELECT` produce a Cartesian product, not parallel iteration.** Two examples relied on parallel iteration that does not actually happen:
   - The "Cartesian to Polar Conversion" example used two parallel `arrayJoin([...]) AS x` / `arrayJoin([...]) AS y` calls, which would have returned 16 rows of all (x, y) combinations rather than the 4 intended points.
   - The "Angle of Inclination" example had the same issue with `run` and `rise`.
   Both were rewritten to use `arrayJoin([(a, b), ...])` over an array of tuples, then access elements with `.1` and `.2`. This is a documented ClickHouse pattern that yields the intended one-row-per-pair behavior.

## Review Notes
- The function signatures and ranges (`asin`/`acos` domain `[-1, 1]`, `atan` codomain `(-π/2, π/2)`, return type Float64) match ClickHouse documentation.
- Numeric checks pass: `asin(0.5) = π/6 ≈ 30°`, `acos(0.5) = π/3 ≈ 60°`, `atan(1) = π/4 = 45°`.
- Haversine example correctly uses `asin(sqrt(...))` form and the right argument order; London↔NYC ~5570 km, which the formula will produce with R = 6371.
- The post correctly notes that `atan(y/x)` cannot distinguish quadrants and recommends `atan2(y, x)` for full 360° bearings; the `nullIf(s.x_meters, 0)` guard against division by zero in the bearing example is a reasonable defensive choice given that the example intentionally illustrates `atan()` (not `atan2()`).
- No version-specific caveats; the math/array/CTE behavior described is stable across recent ClickHouse releases.
