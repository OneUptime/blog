# Validation Summary: How to Detect Missing Data in ClickHouse Time-Series Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- ClickHouse window functions (`lagInFrame`)
- ClickHouse date/time helpers (`toStartOfMinute`, `toStartOfHour`, `toIntervalMinute`, `now()`, `today()`, `dateDiff`)
- `numbers()` table function for time spine generation

## Sources Consulted
- ClickHouse `neighbor` / other functions reference: https://clickhouse.com/docs/sql-reference/functions/other-functions#neighbor
- ClickHouse window functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse `HAVING` clause: https://clickhouse.com/docs/sql-reference/statements/select/having
- ClickHouse `QUALIFY` clause: https://clickhouse.com/docs/sql-reference/statements/select/qualify
- ClickHouse `INTERVAL` operator: https://clickhouse.com/docs/sql-reference/operators#interval
- ClickHouse `ORDER BY ... WITH FILL`: https://clickhouse.com/docs/sql-reference/statements/select/order-by#order-by-expr-with-fill-modifier
- ClickHouse `GROUP BY`: https://clickhouse.com/docs/sql-reference/statements/select/group-by

## Issues Found

1. **Method 1 — broken column reference.** The query referenced `e.event_time` inside `count(e.event_time)` and `IF(count(e.event_time) = 0, ...)`, but the subquery aliased `e` only projected `toStartOfMinute(event_time) AS minute` — `event_time` is not visible outside. Changed to `count(e.minute)` (a non-NULL value when a row matched the LEFT JOIN, and NULL otherwise, so `count()` correctly yields 0 for missing buckets).

2. **Method 1 — unreliable INTERVAL expression syntax.** The original used `INTERVAL (number * 60) SECOND`. ClickHouse's documented `INTERVAL` grammar expects a numeric literal, not a parenthesized expression, and the expression form is not guaranteed to parse. Replaced with `toIntervalMinute(number)`, which accepts arbitrary expressions and is the idiomatic way to build an interval from a runtime value.

3. **Method 3 — `HAVING` without `GROUP BY` is invalid in ClickHouse.** The docs state: "HAVING can't be used if aggregation is not performed. Use WHERE instead." The query had no aggregation, so the `HAVING gap_seconds > 300` clause would raise an error.

4. **Method 3 — `neighbor()` is deprecated and order-unsafe.** `neighbor()` operates on physical block order and does not honor the outer `ORDER BY`, so the previous-row computation could be wrong across block boundaries. Rewrote the query to use `lagInFrame(event_time) OVER (ORDER BY event_time ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)` inside a subquery and filter with `WHERE` in the outer query. Also added `prev_time IS NOT NULL` to drop the first row whose lag is NULL.

5. **Gap Alert Table — `HAVING events = 0` can never match.** `GROUP BY` in ClickHouse only yields groups that contain at least one row, so `count() = 0` is impossible after a plain `GROUP BY toStartOfMinute(event_time)`. Rewrote the insert to build a time spine with `numbers()`, `LEFT JOIN` the events, and `HAVING events = 0` on the joined result — which is how empty buckets are actually materialized.

## Review Notes

- Method 2 (`HAVING events < N` on a plain aggregation) is valid SQL and works in ClickHouse, but note its stated limitation still applies: it only surfaces buckets that *exist* but are underperforming — completely empty minutes are not present in the result. Method 1's time-spine approach is the right tool when you need to detect fully missing buckets.
- `WITH FILL` on `ORDER BY` (e.g. `ORDER BY minute WITH FILL STEP toIntervalMinute(1)`) is another ClickHouse-idiomatic way to pad empty buckets and could be mentioned as an alternative to the `numbers()` time spine in a future revision.
- Method 3 could alternatively be written with ClickHouse's `QUALIFY` clause (supported) to avoid the outer subquery; left as a subquery for clarity and broader version compatibility.
- Method 4 uses `today()` compared against a `DateTime` column — ClickHouse implicitly promotes `Date` to `DateTime` at midnight, which is the intended behavior here.
