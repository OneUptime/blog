# Validation Summary: How to Build Publisher Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- Ad tech / publisher analytics concepts (eCPM, fill rate, floor price, demand sources)

## Sources Consulted
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate functions (count, sum, avg, countIf, round): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse data types (DateTime, UInt32, Float32, LowCardinality, Date): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse date functions (today, toDate, toHour): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
- **Revenue by Hour of Day query — invalid column reference in outer query**: The outer SELECT used `toHour(event_time) AS hour_of_day`, but `event_time` is not a column in the subquery's result set (the subquery only exposes `hour_of_day`, `day`, and `daily_rev`). This would cause a "column not found" error at runtime. Fixed by changing the outer SELECT to reference `hour_of_day` directly instead of recomputing it from a non-existent column.

## Review Notes
- The fill rate query (`countIf(event_type = 'impression') / countIf(event_type = 'request')`) could produce division by zero if a placement has no request events. ClickHouse returns `inf` or `nan` for float division by zero rather than erroring, so the query will run but may produce unexpected results. This is a design consideration rather than a correctness bug.
- The Floor Price Optimization query does not filter by `event_type` in the WHERE clause, so `avg(floor_price)` and `avg(clearing_price)` include all event types. This may be intentional (to see overall averages) but could skew results if clearing_price is 0 for non-impression events.
