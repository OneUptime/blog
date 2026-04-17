# Validation Summary: How to Build Date-Based Reports in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL)
- ClickHouse date/time functions (`toDate`, `toStartOfDay`, `toStartOfWeek`, `toStartOfMonth`, `toHour`, `today`)
- ClickHouse `ORDER BY ... WITH FILL` clause
- ClickHouse window functions (`OVER`)
- MergeTree engine

## Sources Consulted
- ClickHouse SQL reference: Window Functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse SQL reference: ORDER BY / WITH FILL — https://clickhouse.com/docs/en/sql-reference/statements/select/order-by
- ClickHouse SQL reference: Date/time functions — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse GitHub issues on NOT_AN_AGGREGATE errors (e.g. #32744, #28461, #41402) confirming that non-aggregated, non-grouped columns cannot be referenced alongside `GROUP BY`, including inside window function arguments.

## Issues Found
- **Rolling 7-day revenue query was invalid.** The original query had `sum(revenue) OVER (...)` alongside `GROUP BY day`, but `revenue` was neither in the GROUP BY nor aggregated outside the window function. ClickHouse evaluates window functions *after* `GROUP BY`, so columns referenced in them must be in GROUP BY or aggregated; this would have raised a `NOT_AN_AGGREGATE` error. Fixed by moving the daily aggregation into an inner subquery (computing `daily_revenue` via `sum(revenue) ... GROUP BY day`), then applying `sum(daily_revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` in the outer query without a GROUP BY.

## Review Notes
- `WITH FILL FROM today() - 14 TO today() STEP 1` is correct: for Date columns, an integer `STEP` is interpreted as days.
- `today() - 30` / `today() - 14` etc. are valid because Date supports integer subtraction (days).
- The cohort query uses `JOIN (...) USING user_id` on an anonymous subquery; ClickHouse accepts this, and referencing `signup_date` / `event_time` post-join is unambiguous since each name appears on only one side.
- `toStartOfWeek` defaults to mode 0 (Sunday-starting week). Readers wanting ISO weeks may prefer `toStartOfWeek(x, 1)` or `toMonday(x)` — not an error, just a note.
