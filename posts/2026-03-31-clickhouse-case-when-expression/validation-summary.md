# Validation Summary: How to Use CASE WHEN Expression in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL dialect)
- Standard SQL `CASE WHEN` expression (searched and simple forms)
- ClickHouse conditional functions (`multiIf()`)
- ClickHouse date functions (`toDate`, `toMonth`, `toYear`)
- NULL handling (`IS NULL`)

## Sources Consulted
- ClickHouse Operators reference (CASE syntax): https://clickhouse.com/docs/sql-reference/operators
- ClickHouse Conditional Functions (`multiIf`): https://clickhouse.com/docs/sql-reference/functions/conditional-functions
- ClickHouse Date and Time Functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse Type Conversion Functions: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions

## Issues Found
- **Broken SQL in "CASE WHEN vs multiIf()" section.** The original code block stitched two independent queries into one malformed statement: the first `SELECT ... END AS grade_case` had no `FROM` before a second `SELECT` began, and the `-- multiIf()` comment sat in the middle of what the parser would read as a single query. Fixed by splitting into two independent statements, each with its own `FROM (SELECT 85 AS score)` and trailing semicolon so both examples are valid ClickHouse SQL.

## Review Notes
- All other technical claims check out: ClickHouse supports both searched and simple `CASE` forms (per docs, these are internally rewritten to `multiIf` and `transform` respectively), `CASE` works anywhere an expression is valid (SELECT/WHERE/ORDER BY/HAVING and inside aggregates), and `multiIf` has the documented signature `multiIf(cond_1, then_1, ..., else)`.
- The `IS NULL` CASE example relies on the columns being `Nullable(...)`; on non-nullable columns `IS NULL` always returns 0. Worth noting for readers using strict schemas, but not a correctness issue in the post.
- The post's guidance that `CASE WHEN` and `multiIf` "produce identical results" is accurate in the branching-behavior sense; the internal rewrite of the searched `CASE` form to `multiIf` makes them semantically equivalent.
