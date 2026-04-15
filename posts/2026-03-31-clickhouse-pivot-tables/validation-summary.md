# Validation Summary: How to Implement Pivot Tables in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, aggregate combinators)
- ClickHouse conditional aggregation functions: `sumIf`, `countIf`, `avgIf`
- ClickHouse array functions: `groupArray`
- ClickHouse date functions: `toStartOfMonth`, `toDayOfWeek`, `today`
- Python `clickhouse_connect` client library

## Sources Consulted
- ClickHouse documentation on aggregate function combinators (`-If` suffix): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation on `sumIf`, `countIf`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if
- ClickHouse documentation on `toDayOfWeek`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#todayofweek (default mode returns 1=Monday through 7=Sunday, ISO 8601)
- ClickHouse documentation on `groupArray`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse documentation on `toStartOfMonth`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofmonth
- ClickHouse documentation on ARRAY JOIN: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- `clickhouse-connect` Python library documentation: https://clickhouse.com/docs/en/integrations/python

## Issues Found

1. **Bug in Method 2 outer query column reference**: The outer SELECT referenced `toStartOfMonth(order_time) AS month`, but `order_time` is not available from the subquery — only `order_month`, `channel`, and `revenue_total` are output columns. This would cause a "column not found" error at runtime. Fixed by changing the outer query to `order_month AS month`.

2. **Misleading heading for Method 3**: The section was titled "Using ARRAY JOIN for Unpivot Then Re-Pivot" but the code contained no ARRAY JOIN — it used a CTE with conditional aggregation (the same technique as Method 1). Renamed the heading to "CTE with Conditional Aggregation for Re-Pivot" to accurately describe the technique demonstrated.

## Review Notes
- The Python dynamic SQL example constructs queries by string interpolation of values retrieved from the database. While the values originate from the user's own database (not external user input), this pattern is susceptible to SQL injection if channel names ever contain single quotes. A production implementation should escape or parameterize these values. This is acceptable for a tutorial but worth noting.
- The `toDayOfWeek` mapping (1=Monday through 7=Sunday) is correct for the default mode (ISO 8601). ClickHouse supports an optional mode parameter that changes the numbering; the post correctly uses the default.
- All ClickHouse functions used (`sumIf`, `countIf`, `groupArray`, `toStartOfMonth`, `toDayOfWeek`, `today()`) are current, non-deprecated, and syntactically correct.
- The `clickhouse_connect` API usage (`get_client`, `.query()`, `.result_rows`) is correct for the current version of the library.
