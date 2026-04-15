# Validation Summary: How to Calculate Stickiness Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, aggregate functions, CTEs, correlated subqueries)
- Product analytics concepts (DAU/MAU ratio, L-days, feature stickiness)

## Sources Consulted
- ClickHouse documentation on aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse documentation on uniqExact: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse documentation on aggregate function combinators (-If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation on arithmetic operators (division returns Float64 for integer operands): https://clickhouse.com/docs/en/sql-reference/operators/arithmetic
- ClickHouse documentation on `prefer_column_name_to_alias` setting: https://clickhouse.com/docs/en/operations/settings/settings#prefer_column_name_to_alias
- ClickHouse documentation on date functions (today, toDate, toStartOfMonth, toMonday, toYYYYMM): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found

### Issue 1: L-Days query used approximate `uniq()` instead of exact `uniqExact()`
- **What was wrong:** The L-Days query (Query 2) used `uniq()` — an approximate HyperLogLog-based function — to count active days per user. While practically accurate for small cardinalities (max 28), it is semantically incorrect for bucketing users into exact threshold categories. Additionally, calling `uniq()` four separate times in the CASE expression is redundant and could theoretically yield different approximate values across calls.
- **What was changed:** Replaced `uniq()` with `uniqExact()` for exact counting, and refactored the CASE expression to reference the `active_days_last_28` alias instead of repeating the aggregate call. ClickHouse supports alias references within the same SELECT.
- **Why:** Ensures deterministic bucketing and consistency with Query 3, which already uses `uniqExact()`.

### Issue 2: Column alias shadowing in L-Day Distribution query (critical)
- **What was wrong:** The inner subquery used `toStartOfMonth(event_time) AS event_time`, which shadows the original `event_time` column. With ClickHouse's default setting `prefer_column_name_to_alias = 0`, the `uniqExact(toDate(event_time))` in the CASE expression resolves to the alias rather than the original column. This means `toDate(toStartOfMonth(event_time))` is evaluated — always yielding exactly 1 unique date per (user, month) group — so all users would be incorrectly bucketed as 'l1'.
- **What was changed:** Renamed the alias from `event_time` to `month_start` in the inner subquery, and updated the outer query to reference `toYYYYMM(month_start)` accordingly.
- **Why:** Eliminates the alias shadowing, ensuring `uniqExact(toDate(event_time))` correctly counts distinct calendar dates from the original column.

### Issue 3: Broken correlated subquery in Weekly Stickiness Trend (critical)
- **What was wrong:** The correlated subquery `(SELECT uniq(user_id) FROM user_events WHERE event_time >= toDate(event_time) - 29 AND event_time < toDate(event_time) + 1)` intended to compute a rolling 30-day MAU per day. However, `event_time` inside the subquery binds to the subquery's own `user_events.event_time` (not the outer query's), because SQL resolves column references against the innermost scope first. The resulting WHERE clause is a tautology — `event_time >= toDate(event_time) - 29` is always true, and `event_time < toDate(event_time) + 1` is always true — so the subquery counts all unique users in the entire table rather than a rolling window.
- **What was changed:** Replaced the subquery's WHERE clause to reference the outer query's `day` alias: `WHERE toDate(event_time) BETWEEN day - 29 AND day`. Since `day` is not a column in `user_events`, it unambiguously resolves to the outer query's alias, making this a proper correlated subquery.
- **Why:** Ensures each day's stickiness calculation uses the correct rolling 30-day MAU denominator.

## Review Notes
- The DAU/MAU query (Query 1) uses a fixed MAU denominator for all days (total unique users over the 30-day window), rather than a per-day rolling MAU. This is a common simplification and is acceptable, but readers should be aware it differs from a true rolling DAU/MAU calculation.
- The Weekly Stickiness Trend query uses a correlated scalar subquery that executes once per day (~90 times for 90 days of data). For very large tables, this could be slow. A JOIN-based approach would be more performant but less readable for a tutorial.
- The Feature Stickiness query uses `countDistinctIf`, which works in ClickHouse as the `uniqExact` + `If` combinator. This is valid but less commonly seen in ClickHouse-specific tutorials compared to `uniqExactIf`.
