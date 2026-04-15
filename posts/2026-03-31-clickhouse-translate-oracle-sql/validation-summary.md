# Validation Summary: How to Translate Oracle SQL to ClickHouse SQL

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Oracle SQL (SYSDATE, ROWNUM, NVL, DECODE, CONNECT BY, TRUNC, LAG, FROM dual)
- ClickHouse SQL (now(), ifNull, lagInFrame, toStartOfMonth, toDate, row_number, recursive CTEs, window functions)

## Sources Consulted
- ClickHouse documentation on date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on window functions (lag, lagInFrame, row_number): https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on conditional functions (ifNull): https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse documentation on recursive CTEs: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- Oracle documentation on CONNECT BY / hierarchical queries
- Oracle documentation on analytic functions (LAG, LEAD, SUM OVER)
- Oracle documentation on NVL and DECODE

## Issues Found
No technical issues found.

## Review Notes
- The post recommends `lagInFrame()` as the ClickHouse equivalent of Oracle's `LAG()`. While this works correctly for the example shown (default frame includes all preceding rows), ClickHouse also supports the standard SQL `lag()` window function (available since ~v22.x), which is a more direct semantic equivalent of Oracle's `LAG()`. The `lagInFrame` variant restricts lookback to the current window frame, which could produce different results if a restrictive frame clause is specified. For a future update, the post could mention both options.
- Recursive CTE support (`WITH RECURSIVE`) requires ClickHouse 22.x or newer; the post correctly notes "available in newer versions."
- ClickHouse also supports `coalesce()` as an alternative to `ifNull()`, which may be more familiar to Oracle users migrating code that uses `NVL` or `NVL2`.
