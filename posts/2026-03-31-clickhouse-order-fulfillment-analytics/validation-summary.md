# Validation Summary: How to Build Order Fulfillment Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, aggregate functions, window functions, conditional aggregates)
- SQL (DDL, analytical queries, subqueries, window functions)

## Sources Consulted
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on dateDiff function: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation on aggregate functions (minIf, countIf, argMax, quantile): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation on window functions (lagInFrame, row_number): https://clickhouse.com/docs/en/sql-reference/window-functions
- SQL standard on window function evaluation order relative to GROUP BY

## Issues Found

### 1. Window function nested inside aggregate function (Pick-Pack Efficiency query)
- **What was wrong:** The `lagInFrame(event_at) OVER (...)` window function was used directly as an argument inside the `avg()` aggregate function. In SQL (and ClickHouse), window functions are evaluated after GROUP BY, so they cannot be nested inside aggregate functions. ClickHouse rejects this with an error.
- **What was changed:** Restructured the query to use a subquery that computes the window functions (`lagInFrame` and `row_number`) first, then aggregates with `avg()` and `count()` in the outer query. Added `WHERE rn > 1` to exclude the first event per operator partition, where `lagInFrame` would return the default zero DateTime and produce a bogus large time difference.
- **Why:** Without this fix, the query would fail to execute entirely.

### 2. min() used instead of max() in Order Backlog query
- **What was wrong:** The query used `min(f.event_at)` for both the `last_event` column and `hours_in_status` calculation. Since `min()` returns the earliest event time, this would report the time since the order's first event, not the time since the most recent event. The column was named `last_event` but actually returned the first event.
- **What was changed:** Replaced `min(f.event_at)` with `max(f.event_at)` in both the `last_event` alias and the `hours_in_status` calculation.
- **Why:** The intent is to identify orders stuck in their current status. The time spent "in status" should be measured from the most recent event (which represents entry into the current status), not from the first event of the order.

## Review Notes
- The `HAVING placed_at > 0 AND shipped_at > 0` pattern in the cycle time and SLA queries relies on ClickHouse's implicit comparison of DateTime with integer 0. This works because `minIf` returns the default DateTime value (1970-01-01 00:00:00, which equals 0 as UInt32) when no rows match the condition. This is a common ClickHouse idiom but could be made more explicit with `toDateTime(0)` for clarity.
- The breach rate calculation `countIf(...) / count() * 100` works correctly in ClickHouse because the `/` operator on integer types returns Float64 (unlike standard SQL where integer division truncates). This is a ClickHouse-specific behavior worth noting for readers coming from other databases.
- The CREATE TABLE schema does not include a TTL clause, which would be a typical addition for production event data to manage storage growth automatically.
