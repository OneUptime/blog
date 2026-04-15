# Validation Summary: How to Handle NULLs in JOIN Operations in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL syntax, MergeTree engine, JOIN operations)
- Nullable data types in ClickHouse
- ClickHouse functions: ifNull, assumeNotNull, toString

## Sources Consulted
- ClickHouse documentation on JOIN clause: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse documentation on join_use_nulls setting: https://clickhouse.com/docs/en/operations/settings/settings#join_use_nulls
- ClickHouse documentation on Nullable type: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse documentation on ifNull function: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#ifnull
- ClickHouse documentation on assumeNotNull function: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#assumenotnull

## Issues Found

### 1. Missing `SET join_use_nulls = 1` (critical)
**What was wrong:** The entire post assumes that unmatched rows in LEFT JOIN and FULL OUTER JOIN produce NULL values for all right-side columns, including non-nullable ones (e.g., `u.user_id` UInt64, `u.username` String). However, ClickHouse's default setting is `join_use_nulls = 0`, which fills unmatched non-nullable columns with the type's default value (0 for integers, '' for strings) rather than NULL. This means:
- The LEFT JOIN output would show `u.username = ''` (empty string) instead of NULL for unmatched rows
- `ifNull(u.username, 'Guest User')` would return `''` instead of `'Guest User'`
- `WHERE u.user_id IS NULL` would never match unmatched rows (value would be 0, not NULL)
- The anti-join pattern `WHERE o.order_id IS NULL` would return no results

**What was changed:** Added a `SET join_use_nulls = 1;` statement at the top of the sample setup section with an explanation of why it is needed and how it differs from the default behavior.

### 2. Incorrect row ordering in aggregation output
**What was wrong:** The aggregation query uses `ORDER BY total_revenue DESC`, but the output showed US (50.00) before UK (75.50). Since 75.50 > 50.00, UK should appear before US in descending order.

**What was changed:** Swapped the US and UK rows in the expected output to match the correct descending order: Unknown (260.00), UK (75.50), US (50.00).

## Review Notes
- All SQL syntax is valid for current ClickHouse versions. CREATE TABLE, INSERT, SELECT, JOIN, CASE, GROUP BY, ORDER BY with NULLS LAST all use correct syntax.
- The `assumeNotNull` usage is correctly paired with a `WHERE user_id IS NOT NULL` filter in the subquery, which is the safe pattern.
- FULL OUTER JOIN is supported in ClickHouse (since version 21.3+). The syntax and column handling are correct.
- The `ifNull(toString(o.user_id), 'guest')` pattern correctly handles the Nullable(UInt64) → Nullable(String) → String chain.
- The anti-join pattern (LEFT JOIN + IS NULL filter) is a standard and correct approach, provided `join_use_nulls = 1` is set.
