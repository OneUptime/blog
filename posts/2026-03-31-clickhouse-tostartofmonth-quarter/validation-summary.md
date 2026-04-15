# Validation Summary: How to Use toStartOfMonth() and toStartOfQuarter() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (date/time functions, window functions, aggregation)
- SQL (GROUP BY, window functions with `lagInFrame`, INTERVAL arithmetic)

## Sources Consulted
- ClickHouse official documentation for `toStartOfMonth()`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofmonth
- ClickHouse official documentation for `toStartOfQuarter()`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofquarter
- ClickHouse official documentation for `lagInFrame()`: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse official documentation for `uniq()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official documentation for `today()`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#today

## Issues Found
- **"fiscal quarter" mislabel (line 96)**: The post described `toStartOfQuarter()` as returning the first day of the "fiscal quarter." ClickHouse uses calendar quarters (Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct), not fiscal quarters, which vary by organization. Changed "fiscal quarter" to "calendar quarter."

## Review Notes
- All SQL examples use correct ClickHouse syntax and functions (`toStartOfMonth`, `toStartOfQuarter`, `toDate`, `today()`, `uniq`, `count()`, `lagInFrame`, `toYear`, `INTERVAL`).
- The `lagInFrame()` window function is the correct ClickHouse-specific function for accessing previous rows within a window frame. Standard SQL `LAG()` has limited support in ClickHouse, so using `lagInFrame()` is the right approach.
- The cohort retention query correctly uses `min(event_date) OVER (PARTITION BY user_id)` as a window function to derive each user's first event date.
- The "Same Period Last Year" query logic is sound: `toStartOfQuarter(today() - INTERVAL 1 YEAR)` correctly identifies the same calendar quarter one year prior.
- The section on "Comparing Monthly and Quarterly Granularity Side by Side" mentions `GROUP BY ROLLUP` as an option in the text but the code example uses a standard `GROUP BY`. This is not incorrect — the text presents it as one of two alternatives — but readers looking for a ROLLUP example won't find one.
