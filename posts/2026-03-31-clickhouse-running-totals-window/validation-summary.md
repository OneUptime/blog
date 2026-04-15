# Validation Summary: How to Compute Running Totals with Window Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (window functions, MergeTree engine)
- SQL (window frame specifications, SUM aggregate, PARTITION BY, ORDER BY)
- Time series analytics patterns (running totals, rolling sums, Pareto analysis)

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on aggregate functions (SUM): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/sum
- ClickHouse documentation on date functions (toQuarter, toYear): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on ROUND function: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions
- SQL standard window function frame specification semantics (ISO/IEC 9075)

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples use explicit `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` frame specifications rather than relying on the implicit default frame (which is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` per the SQL standard when ORDER BY is present). This is good practice since ROWS vs RANGE behavior differs when duplicate ORDER BY values exist.
- The self-join verification example assumes unique `sale_date` values in the `daily_sales` table. If duplicate dates exist, the self-join and window function could yield different results. This is acceptable given the table name implies one row per day.
- Non-equi join conditions in the ON clause (used in the self-join example) require ClickHouse 22.6+ or the `allow_experimental_join_condition` setting in earlier versions. The post does not mention version requirements, but this is minor since it is presented only as a verification technique for small datasets.
- The post correctly notes that `SUM(revenue) OVER ()` (empty OVER clause) returns the grand total across all rows, which aligns with standard SQL behavior in ClickHouse.
