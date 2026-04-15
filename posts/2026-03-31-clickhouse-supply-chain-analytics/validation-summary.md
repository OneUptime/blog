# Validation Summary: How to Build a Supply Chain Analytics System with ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, Materialized Views)
- SQL (DDL and analytical queries)
- Supply chain domain concepts (inventory turnover, OTD, fill rate, days of supply)

## Sources Consulted
- ClickHouse official documentation: CREATE TABLE syntax, data types (DateTime, DateTime64, Decimal, LowCardinality, Nullable, UUID) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse aggregate functions: count, countIf, avg, sum, any, minIf, quantile, round, multiIf, nullIf, dateDiff, toDate, toStartOfWeek, toYYYYMM — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse table engines: MergeTree, SummingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family
- ClickHouse Materialized Views — https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse SQL syntax: CTE (WITH), PARTITION BY, ORDER BY, USING join syntax — https://clickhouse.com/docs/en/sql-reference/statements/select

## Issues Found
1. **Shipment Transit Time Analysis query — nested aggregate functions (originally lines 207-226):** The query used `avg(dateDiff('hour', minIf(...), minIf(...)))` and `quantile(0.95)(dateDiff('hour', minIf(...), minIf(...)))`, nesting aggregate functions inside other aggregate functions. ClickHouse (and standard SQL) does not permit this — it raises an error like "Aggregate function is found inside another aggregate function." Fixed by introducing a CTE (`shipment_times`) that first computes per-shipment pickup and delivery timestamps using `minIf` grouped by `shipment_id`, then aggregating transit times across shipments in the outer query.

## Review Notes
- The "On-Time Delivery Rate" query divides by `countIf(status = 'received')` without `nullIf` protection. If a supplier has only cancelled orders in the window, this produces inf/nan. Not a syntax error, but a robustness concern for production use.
- The "Fill Rate" query similarly divides by `sum(quantity_ordered)` without a zero guard.
- The section titled "Demand Forecast vs Actual by Week" only shows actual demand aggregation — no forecast data or comparison is present. The title is slightly misleading but the query itself is correct.
- The materialized view omits the `POPULATE` keyword, which means it only captures new inserts. This is actually the recommended approach in most cases and is not an error.
- All schema definitions use appropriate ClickHouse types and engine configurations. LowCardinality is correctly applied to low-distinct-value string columns. Nullable is correctly used only where needed (confirmed_at, received_at).
