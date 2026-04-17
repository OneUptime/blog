# Validation Summary: How to Track EV Charging Station Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (schema design, MergeTree, AggregatingMergeTree, materialized views, TTL)
- SQL (DDL, DML, aggregation, CTEs, CROSS JOIN)
- Time-series data modeling
- EV charging telemetry (OCPP-style session/metrics data)

## Sources Consulted
- [ClickHouse Date and Time Functions Documentation](https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)
- [ClickHouse: Working with Time Series Data](https://clickhouse.com/blog/working-with-time-series-data-and-functions-ClickHouse)
- [ClickHouse GitHub Issue #4293 — toStartOfTenMinutes](https://github.com/ClickHouse/ClickHouse/issues/4293)
- [ClickHouse GitHub PR #4298 — toStartOfTenMinutes](https://github.com/ClickHouse/ClickHouse/pull/4298/files)
- [Tinybird: How to round timestamps in ClickHouse](https://www.tinybird.co/blog/round-timestamps-clickhouse)

## Issues Found
- **`toStartOfFiveMinutes` → `toStartOfFiveMinute`**: The post used the plural form `toStartOfFiveMinutes`, which does not exist in ClickHouse. The correct function name is the singular `toStartOfFiveMinute`. ClickHouse's date-time rounding functions are inconsistently named (`toStartOfMinute`, `toStartOfFiveMinute`, `toStartOfTenMinutes`, `toStartOfFifteenMinutes`), but the five-minute version is singular. Fixed in the "Power Delivery Over Time" query.

## Review Notes
- The schema definitions (`MergeTree`, `AggregatingMergeTree`, `LowCardinality(String)`, `Nullable(Float32)`, `Decimal(10, 2)`, `UUID DEFAULT generateUUIDv4()`) are valid for modern ClickHouse versions.
- The materialized view using `argMaxState` / `argMaxMerge` and `maxState` / `maxMerge` combinators is correct for maintaining latest-state rollups on an `AggregatingMergeTree`.
- The `WITH ... AS (SELECT ...)` CTE with `CROSS JOIN` against a scalar subquery is supported in ClickHouse 20.2+ and works as shown.
- `dateDiff('minute', started_at, ended_at)`, `toYYYYMM`, `toStartOfHour`, `toStartOfMonth`, `toDate`, `countIf`, `median`, and `INTERVAL N DAY/HOUR` syntax are all valid.
- `ALTER TABLE ... MODIFY TTL` syntax is valid; after this change, data older than 90 days will be dropped during background merges, not immediately.
- The "Daily Energy Delivered" query uses `max(energy_kwh) - min(energy_kwh)`, which assumes `energy_kwh` is a cumulative counter per session/meter. This is a common OCPP convention but is not explicitly stated in the schema description — readers should be aware that if `energy_kwh` is an interval delta, they should use `sum()` instead. Not changed since the author's intent appears to treat it as cumulative.
- `toStartOfInterval(recorded_at, INTERVAL 5 MINUTE)` would be a more future-proof alternative to `toStartOfFiveMinute`, but the post's current form is technically correct.
