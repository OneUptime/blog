# Validation Summary: How to Build Live Event Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- ClickHouse data types: UInt64, UUID, LowCardinality(String), DateTime64(3)
- ClickHouse aggregate / conditional functions: countIf, sumIf, uniqExact
- ClickHouse time functions: toStartOfMinute, toStartOfSecond, toYYYYMMDD
- ClickHouse window functions (OVER ORDER BY)

## Sources Consulted
- ClickHouse SQL reference — CREATE TABLE / MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse date/time functions (toStartOfMinute, toStartOfSecond, toYYYYMMDD): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate function combinators (-If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse uniqExact: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found
- **Concurrent Viewers query logic was incorrect.** The original query computed `sumIf(1, join) - sumIf(1, leave)` grouped by minute and labeled the result `concurrent_viewers`, but that expression yields only the *net change* per minute — not the actual concurrent viewer count across time. The section heading ("Concurrent Viewers at Any Point in Time") and the lead-in text ("Track simultaneous active sessions") both imply a running total. Fixed by wrapping the per-minute net change in a subquery and computing a running sum with a window function: `sum(net_change) OVER (ORDER BY minute)`. Also switched `sumIf(1, …)` to the equivalent but idiomatic `countIf(…)`.

## Review Notes
- The "Real-Time Active Viewer Count" query assumes one join and at most one leave per `session_id`; a session that disconnects and rejoins with the same `session_id` will be excluded. For stricter correctness one could compare the latest `join` and `leave` timestamps per session, but the simple NOT IN form is a reasonable approximation for live dashboards and has been left as-is.
- `DateTime64(3)` is required for `toStartOfSecond` to produce sub-second resolution output — the schema already uses `DateTime64(3)`, so the reactions-per-second query is consistent.
- `PARTITION BY toYYYYMMDD(ts)` produces daily partitions, which is appropriate for event-scale data; users with very long-running events may prefer weekly or monthly partitions to avoid excessive parts.
- The drop-off funnel and conversion queries are syntactically correct; note that `uniqExact` is exact but memory-heavy — for very high-cardinality workloads `uniq` (HyperLogLog) would be faster at the cost of approximation.
