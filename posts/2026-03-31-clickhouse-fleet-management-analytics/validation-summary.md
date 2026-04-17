# Validation Summary: How to Analyze Fleet Management Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, type system)
- Telematics / fleet management data modeling
- Time-series analytics

## Sources Consulted
- ClickHouse SQL reference: https://clickhouse.com/docs/en/sql-reference
- ClickHouse data types (LowCardinality, Float32/64, UInt8, DateTime64): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate function combinators (`-If` suffix): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse date/time functions (`today`, `toDate`, `toYYYYMMDD`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse functions: `nullIf`, `round`, `floor`, `countIf`, `sumIf`, `avg`, `max`, `min`, `count`

## Issues Found
- **Vehicle Utilization query - incorrect unit conversion**: The expression `sumIf(1, engine_on = 1) * 10 / 60.0 AS engine_hours` produced minutes, not hours. With a 10-second ping interval, multiplying by 10 yields seconds; dividing by 60 yields minutes. To get hours, the divisor must be 3600. Changed `60.0` to `3600.0` so the alias `engine_hours` correctly reflects the value. The Idle Time Analysis query that uses `* 10 / 60.0 AS idle_minutes` is correct — minutes is the right unit there.

## Review Notes
- `PARTITION BY toYYYYMMDD(recorded_at)` creates daily partitions. This is syntactically valid (the function returns a UInt32 like 20260417), but for a high-volume telematics workload retained over many months, monthly partitioning (`toYYYYMM`) is a more common ClickHouse best practice to keep the partition count manageable. Not a correctness issue, so left as-is.
- The Vehicle Utilization query filters `event_type = 'gps_ping'` but also computes `max(odometer_km) - min(odometer_km)`. This is fine assuming GPS pings always include odometer values, which is the implied schema.
- The Maintenance Odometer Trigger query depends on at least one telemetry record per vehicle in the last day; vehicles parked/offline longer than that will not appear. This is an inherent design choice rather than a bug.
- All ClickHouse syntax (LowCardinality, MergeTree, combinators like `countIf`/`sumIf`, `today()`, `nullIf`, `DateTime64(3)`) is current and correct.
