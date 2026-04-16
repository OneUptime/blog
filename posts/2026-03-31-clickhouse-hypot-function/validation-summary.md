# Validation Summary: How to Use hypot() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL math functions (`hypot`, `sqrt`, `pow`, `round`)
- MergeTree table engine
- ClickHouse array functions (`arrayJoin`, `ARRAY JOIN` clause)

## Sources Consulted
- ClickHouse math functions reference: https://clickhouse.com/docs/sql-reference/functions/math-functions#hypot
- ClickHouse ARRAY JOIN / arrayJoin docs: https://clickhouse.com/docs/sql-reference/functions/array-join
- ClickHouse MergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found
- **3D Euclidean Distance example (critical bug)**: The original query used three parallel `arrayJoin()` calls in the same SELECT list, assuming they would unroll in parallel to produce 3 rows. Per the ClickHouse docs ("A query can use multiple arrayJoin functions. In this case, the transformation is performed multiple times and the rows are multiplied."), this actually produces a cartesian product of 3 × 3 × 3 = 27 rows, which is not what the surrounding prose describes. Replaced the query with the idiomatic `ARRAY JOIN dxs AS dx, dys AS dy, dzs AS dz` pattern, which is documented as the correct way to unroll multiple equal-length arrays in parallel. The math, column aliases, and expected 3 output rows now match the prose.

## Review Notes
- `hypot(x, y)` was introduced in ClickHouse 20.12.0 and accepts `(U)Int*`, `Float*`, and `Decimal*` inputs, always returning `Float64`. The post's claim that it returns `Float64` is correct.
- The post correctly states there is no three-argument `hypot()` overload — ClickHouse only supports the two-argument form.
- Numerical-stability claim (avoids overflow for large values and underflow for small values before squaring) is accurate and mirrors the ClickHouse documentation's own wording.
- `hypot(3, 4) = sqrt(pow(3, 2) + pow(4, 2))` evaluating to `1` (true) is expected for these small values where no precision loss occurs, so the "Comparison with Naive Formula" example is correct.
- `CROSS JOIN ... WHERE a.poi_id < b.poi_id` to deduplicate pairs is valid and idiomatic ClickHouse SQL.
- All other SQL examples (basic usage, distance from origin, pairwise distance, nearest neighbor, vector magnitude / unit vectors) are syntactically valid and semantically correct.
