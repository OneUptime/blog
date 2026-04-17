# Validation Summary: How to Build Video Streaming Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, TTL, partitioning, LowCardinality, DateTime64)
- SQL analytics for video streaming / CDN telemetry
- Aggregate functions (`countIf`, `uniq`, `quantile`, `avg`)
- Time-bucketing functions (`toStartOfHour`, `toStartOfFiveMinutes`, `toYYYYMM`, `toDate`)

## Sources Consulted
- ClickHouse SQL reference: https://clickhouse.com/docs/en/sql-reference
- MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- Date & time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Aggregate functions `countIf`/`quantile`/`uniq`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- TTL clauses: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- LowCardinality data type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality

## Issues Found
No technical issues found. All DDL and DML examples use valid ClickHouse syntax:

- `CREATE TABLE ... ENGINE = MergeTree()` with `PARTITION BY toYYYYMMDD(occurred_at)`, `ORDER BY`, and column-level-agnostic table `TTL toDate(occurred_at) + INTERVAL 1 YEAR` are all valid.
- `LowCardinality(String)` and `LowCardinality(FixedString(2))` are legal type combinations.
- `DateTime64(3)` correctly specifies millisecond precision.
- `countIf(expr)`, `quantile(level)(expr)` parametric aggregate syntax, `uniq(...)`, and `count(DISTINCT ...)` all work in ClickHouse.
- `toStartOfFiveMinutes`, `toStartOfHour`, `toYYYYMM`, and `toDate` are documented ClickHouse functions.
- `dateDiff('second', start, end)` is valid.
- `today() - INTERVAL 7 DAY` and `now() - INTERVAL 24 HOUR` return the correct types for comparison with `DateTime64`.

## Review Notes
- `latency_ms UInt16` caps at 65,535 ms (~65 s). That ceiling is fine for typical CDN playback latency, but users ingesting long-stall or error timeouts may want `UInt32` instead. Not an error — a modeling caveat.
- `PARTITION BY toYYYYMMDD(occurred_at)` creates one partition per day. Combined with the 1-year TTL this stays well under ClickHouse's recommended partition count, but teams ingesting multiple years of data may prefer monthly (`toYYYYMM`) partitioning.
- `uniq()` is an approximate (HyperLogLog) distinct count; the "Top Content by Unique Viewers" query uses it, which is the idiomatic choice, while "Viewer Engagement" uses exact `count(DISTINCT session_id)`. Both are correct; authors of larger workloads may prefer `uniq` throughout for performance.
- Consider pointing readers to `AggregatingMergeTree` + materialized views for the dashboards mentioned in the Summary — the post alludes to this but does not demonstrate it.
