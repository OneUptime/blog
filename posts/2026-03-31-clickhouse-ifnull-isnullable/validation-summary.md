# Validation Summary: How to Use ifNull() and isNullable() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL dialect)
- Nullable data types
- `ifNull()`, `isNullable()`, `isNull()`, `coalesce()`, `nullIf()` functions
- Aggregate functions with NULL handling
- `multiIf()` conditional function

## Sources Consulted
- [ClickHouse Functions for working with Nullable values](https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls)
- [ClickHouse GitHub Issue #38611 (isNullable function)](https://github.com/ClickHouse/ClickHouse/issues/38611)
- [Altinity KB: assumeNotNull and friends](https://kb.altinity.com/altinity-kb-functions/assumenotnull-and-friends/)

## Issues Found
No technical issues found.

Verified the following:
- `ifNull(x, alt)` exists in ClickHouse and behaves as described (returns `x` if non-NULL, otherwise `alt`) — equivalent to `coalesce(x, alt)` with two arguments.
- `isNullable(x)` exists, returns `UInt8` (1 if argument type is `Nullable(T)`, 0 otherwise), and reflects type rather than value — the blog's claim that it returns the same value for every row is accurate.
- `isNull(x)` performs per-row NULL value checks, contrasted correctly with `isNullable`.
- `nullIf(x, y)` returns NULL when `x = y`, correctly used in the chained fallback example.
- Aggregate behavior: `avg(score)` excludes NULLs (8.5 = (9.5+7.2+8.8)/3), `avg(ifNull(score, 0.0))` = 5.1 = 25.5/5 — math checks out.
- `multiIf()` rating example outputs match expected evaluation for each row.
- `ORDER BY ifNull(score, -1e10) DESC` output order is correct (alice 9.5, eve 8.8, charlie 7.2, then NULLs).
- `CREATE TABLE ... ENGINE = MergeTree() ORDER BY user_id` syntax is correct.
- `concat(username, '@defaultdomain.com')` usage is valid ClickHouse syntax.

## Review Notes
- The claim "It is evaluated at query planning time" for `isNullable` is a reasonable description — since the result depends only on the argument's declared type, ClickHouse's planner can fold this into a constant. The official docs do not explicitly describe it this way, but the behavioral observation (same value per row) is correct.
- The post describes `ifNull` as equivalent to `coalesce(value, fallback)` with exactly two arguments; ClickHouse's `coalesce` accepts any number of arguments (1+), so this framing is accurate.
- No version-specific caveats: these functions have been stable in ClickHouse for many releases.
