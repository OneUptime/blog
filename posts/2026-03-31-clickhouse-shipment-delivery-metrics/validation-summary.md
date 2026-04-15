# Validation Summary: How to Track Shipment and Delivery Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, Date/DateTime arithmetic)
- SQL analytics patterns (aggregation, conditional counting, window functions, HAVING with aliases)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE and MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Data types (LowCardinality, Nullable, Date, DateTime, Float32) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: Aggregate functions (count, countIf, avg, round) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: Window functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: dateDiff function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation: Date arithmetic (today(), Date subtraction) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#today
- ClickHouse documentation: toYYYYMM function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#toyyyymm

## Issues Found
No technical issues found.

## Review Notes
- The `Nullable(LowCardinality(String))` type for `exception_reason` is accepted by ClickHouse but internally normalized to `LowCardinality(Nullable(String))`. Both forms work; the canonical form is `LowCardinality(Nullable(String))`. This is a minor style preference, not an error.
- The percentage calculations (e.g., `otd_pct`, `late_pct`) could produce `inf` if the denominator `countIf(actual_delivery IS NOT NULL)` evaluates to zero (ClickHouse returns `inf` for float division by zero). In practice this is unlikely given the WHERE filters, but production dashboards may want to wrap these with `if(denominator > 0, ..., 0)`.
- The `avg_days_late` column in the Regional Delivery Performance query computes the average across all delivered shipments (including on-time ones), so the value represents average deviation from the promised date rather than strictly "days late." This is a reasonable metric for identifying problem regions.
