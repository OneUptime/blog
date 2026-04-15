# Validation Summary: How to Use ClickHouse for Marketing Attribution Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, CTEs, date arithmetic)
- SQL (JOINs, window functions: row_number, count OVER, subqueries)
- Marketing attribution models (last-touch, linear, time-decay)

## Sources Consulted
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse Date/Time Functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse JOIN Clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/join
- ClickHouse MergeTree Engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse Data Types documentation (LowCardinality, Decimal, Date): https://clickhouse.com/docs/sql-reference/data-types
- ClickHouse Mathematical Functions documentation (exp): https://clickhouse.com/docs/sql-reference/functions/math-functions

## Issues Found
1. **Last-Touch Attribution query — incorrect window function partitioning**: The original query computed `row_number() OVER (PARTITION BY user_id ORDER BY event_time DESC)` inside a subquery, before the join with `conversions`. This meant `rn = 1` selected the globally most recent touchpoint per user, not the most recent touchpoint before each specific conversion. For users with multiple conversions, or whose latest touchpoint occurred after an earlier conversion, the query would either miss conversions or attribute them incorrectly. **Fix**: Restructured the query to first join `conversions` with `marketing_touchpoints` (filtering touchpoints to those before each conversion), then apply `row_number() OVER (PARTITION BY c.user_id, c.conversion_time ORDER BY t.event_time DESC)` so the window is correctly scoped per conversion event. The outer query then filters to `rn = 1`.

## Review Notes
- The schema definitions (MergeTree engine, PARTITION BY toYYYYMM, ORDER BY, LowCardinality, Decimal types) are all correct and follow ClickHouse best practices.
- The Linear Attribution query correctly uses `count() OVER (PARTITION BY t.user_id, c.conversion_time)` to count touchpoints per conversion, then divides revenue equally. This is sound.
- The Time-Decay Attribution query correctly implements exponential decay with half-life of 7 days using `exp(-0.693 * days / 7)` where 0.693 ≈ ln(2). The normalization by total weight per (user, conversion) ensures attributed revenue sums to actual revenue. This is sound.
- `today() - 90` is valid ClickHouse syntax — the Date type is stored as days since epoch and supports integer subtraction natively.
- `dateDiff('day', start, end)` is the correct ClickHouse syntax (both `dateDiff` and `date_diff` are valid aliases).
