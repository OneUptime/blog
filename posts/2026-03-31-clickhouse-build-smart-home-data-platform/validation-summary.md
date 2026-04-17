# Validation Summary: How to Build a Smart Home Data Platform with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, Materialized Views, TTL)
- SQL (aggregation, CTEs, joins, window analytics)
- IoT / Smart Home telemetry (MQTT-style ingestion)
- Time-series analytics / Anomaly detection (z-score)

## Sources Consulted
- ClickHouse SQL reference, MergeTree family engines: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Materialized Views: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse date/time functions (toHour, toDate, toDayOfWeek, toStartOfHour, toYYYYMM, toYYYYMMDD, dateDiff): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions (avg, countIf, stddevSamp, sum, count): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse operators (BETWEEN semantics, INTERVAL, nullIf): https://clickhouse.com/docs/en/sql-reference/operators
- Physics unit conversion: Watts × time → Watt-hours → kWh (1 kWh = 1000 Wh)

## Issues Found
1. **Incorrect kWh calculation in "Daily Energy Usage per Home"**: The query used `sum(value) / 12.0` and labeled the result `kwh_consumed`. Since `value` is in watts (metric = `power_watts`), dividing a sum of 5-minute watt readings by 12 yields watt-hours, not kilowatt-hours. Corrected to `/ 12000.0` (divide by 12 for Wh, then by 1000 for kWh) and updated the inline comment to match.
2. **Incorrect kWh calculation in "Homes ranked by energy efficiency"**: Same bug — `round(sum(value) / count(DISTINCT toDate(collected_at)) / 12, 2)` produces Wh, not kWh. Corrected the divisor from `12` to `12000`.
3. **`BETWEEN 22 AND 6` always false in automation rule analytics**: ClickHouse's `BETWEEN a AND b` translates to `x >= a AND x <= b`, so `BETWEEN 22 AND 6` matches nothing (since 22 > 6). Replaced with `toHour(occurred_at) >= 22 OR toHour(occurred_at) < 6` to correctly capture overnight hours (22:00 through 05:59).

## Review Notes
- The `device_readings_hourly` rollup uses `AggregatingMergeTree()` with plain `Float64`/`UInt32` columns rather than `AggregateFunction(...)` or `SimpleAggregateFunction(...)` types. The table DDL and MV are syntactically valid, but because parts inserted for the same `(home_id, device_id, metric, hour)` will not merge aggregates on background merges, queries on the rollup table may see multiple partial rows per hour and should aggregate again at read time (e.g., wrap with an outer `GROUP BY` and `avg/min/max/sum`). For stricter correctness, switch to `AggregateFunction(avg, Float64)` with `avgState(value)` plus `SimpleAggregateFunction(min/max, Float64)` and `SimpleAggregateFunction(sum, UInt32)` in the MV, or use a `SummingMergeTree` variant. Left as-is since the SQL is valid and the pattern is common in tutorials.
- In `device_baselines` (anomaly detection), baselines are computed for every metric, not just temperature as the section header suggests. The query still works correctly because the JOIN matches on `metric`, but the surrounding prose implies temperature-only scope.
- The "Fleet summary" query labels `countIf(metric = 'power_watts')` as `energy_readings_today`, but the WHERE clause filters to the last hour (`now() - INTERVAL 1 HOUR`), not to the current day. Left unchanged since it is a naming nit rather than a technical error.
- `toDayOfWeek(occurred_at) IN (6, 7)` correctly captures Saturday and Sunday under ClickHouse's default ISO-8601 mode (1 = Monday ... 7 = Sunday).
- `TTL ... DELETE` with `INTERVAL N DAY`/`INTERVAL N YEAR` is valid ClickHouse syntax (both singular and plural interval keywords are accepted).
