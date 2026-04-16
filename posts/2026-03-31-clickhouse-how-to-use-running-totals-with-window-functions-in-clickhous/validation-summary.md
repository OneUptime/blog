# Validation Summary: How to Use Running Totals with Window Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL window functions)
- MergeTree table engine
- ClickHouse data types (Float64, UInt32, UInt64, Int32, Date, DateTime, LowCardinality)
- ClickHouse date/time functions (toYear, dateDiff)
- Standard SQL window functions (SUM, AVG, MIN, MAX, COUNT, ROW_NUMBER) with OVER clause

## Sources Consulted
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse date/time function documentation
- SQL standard behavior for default window frame specifications

## Issues Found
- **"Simplified Running Total Syntax" section — incorrect equivalence claim**: The post originally stated that `sum(revenue) OVER (ORDER BY sale_date)` is equivalent to `sum(revenue) OVER (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`. Per ClickHouse docs, the default frame when `ORDER BY` is specified is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (not `ROWS`). These produce identical results only when the `ORDER BY` values are unique; with ties, `RANGE` assigns the same accumulated value to all tied rows while `ROWS` increments row-by-row. Updated the section to clarify this: the default is the `RANGE` frame, and the two forms are equivalent only for unique `ORDER BY` values.

## Review Notes
- All CREATE TABLE statements use valid ClickHouse syntax with proper engine and column types.
- `dateDiff('month', cohort_month, revenue_month)` uses the correct ClickHouse function signature with unit as first argument.
- `toYear(sale_date)` is a valid ClickHouse function.
- `ROW_NUMBER() OVER (...)` is supported in ClickHouse window functions.
- Tables `category_daily_sales` and others referenced in query examples are used without accompanying CREATE TABLE statements — this is a common tutorial convention and not a technical error.
- The subquery-with-ROW_NUMBER pattern for getting the latest running inventory per product is a valid approach, though in practice using `argMax` or an `ORDER BY ... LIMIT 1 BY product_id` construct would be more idiomatic in ClickHouse. Not flagged as an error since the shown approach works correctly.
