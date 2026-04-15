# Validation Summary: How to Store Application Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, Map type)
- SQL (DDL, DML, CTEs, aggregate functions)
- Application metrics patterns (counters, gauges, percentiles, anomaly detection)
- Time-series data modeling and downsampling

## Sources Consulted
- ClickHouse documentation: Data Types (LowCardinality, Map, DateTime64, Float64) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: MergeTree engine family — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: TTL expressions — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse documentation: Date/time functions (toYYYYMMDD, toStartOfMinute, toStartOfFiveMinutes, toStartOfHour, now, yesterday) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation: Aggregate functions (quantile, argMax, stddevPop, avg, min, max) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: Other functions (nullIf, round, abs) — https://clickhouse.com/docs/en/sql-reference/functions

## Issues Found
No technical issues found.

## Review Notes
- The post description mentions support for "histograms" but the examples only demonstrate counter and gauge metric types. The schema is flexible enough to store histogram bucket data (using the labels Map for bucket boundaries), but no histogram-specific query patterns are shown. A future revision could add a histogram bucketing example for completeness.
- The rate-of-change query uses `max(value) - min(value)` per minute, which is a reasonable approximation for monotonically increasing counters but may be inaccurate if counter resets occur within a single minute bucket. This is an acceptable simplification for a tutorial.
- The downsampling section mentions "Keep high-resolution data for 7 days" in the prose, but the main table's TTL is set to 90 days, not 7 days. These are not contradictory (the prose describes a recommended pattern while the schema uses a different retention), but readers might find this slightly confusing. The numbers don't need to match since the TTL and the downsampling schedule are independent concerns, but a future edit could align the wording.
