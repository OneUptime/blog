# Validation Summary: How to Track Medical Device Telemetry in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, Nullable types, TTL, partitioning)
- SQL (aggregations, conditional counts, GROUP BY / HAVING)
- IoT / Medical Device Telemetry concepts

## Sources Consulted
- ClickHouse documentation on data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation on Nullable: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse documentation on aggregate functions (countIf, round, count): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation on DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation on arithmetic operators (division returns Float64): https://clickhouse.com/docs/en/sql-reference/operators#arithmetic

## Issues Found
1. **`metric_value` column type was non-nullable but used in NULL checks.**
   - **What was wrong:** The `metric_value` column was defined as `Float64` (non-nullable), but the "Device Uptime Analysis" query used `countIf(metric_value IS NOT NULL)` to distinguish valid readings from missing ones. Since a plain `Float64` column can never be NULL in ClickHouse, this condition would always evaluate to true, making `valid_readings` always equal `total_readings` and `uptime_pct` always 100%.
   - **What was changed:** Changed `metric_value Float64` to `metric_value Nullable(Float64)` in the CREATE TABLE statement.
   - **Why:** For the uptime analysis logic to work correctly, the column must be able to store NULL values to represent missing or absent readings from a device.

## Review Notes
- The Predictive Maintenance Signals query computes `avg_alarms_per_day_7d` over a window that includes today's alarms in the numerator. This slightly inflates the historical average, but is a reasonable simplification for a blog-level example and does not constitute a technical error.
- All other SQL syntax is correct and uses current ClickHouse functions and types (toYYYYMM, toHour, DateTime64, LowCardinality, countIf, round, count(DISTINCT ...)).
- ClickHouse's `/` operator returns Float64 even for integer operands, so `countIf(...) / 7` in the predictive maintenance query correctly produces a floating-point result without needing an explicit cast.
- The TTL of 5 years is appropriate for the stated post-market surveillance use case.
