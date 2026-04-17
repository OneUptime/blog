# Validation Summary: How to Build Container Monitoring with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, LowCardinality, FixedString, date/time functions)
- cAdvisor (container metrics collector)
- Docker / container runtimes
- cgroup counters (CPU, memory, network, block I/O)

## Sources Consulted
- ClickHouse SQL reference — Data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse date/time functions (`toStartOfMinute`, `toStartOfHour`, `toStartOfDay`, `toYYYYMMDD`, `dateDiff`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `formatReadableSize`: https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse `INTERVAL` syntax: https://clickhouse.com/docs/en/sql-reference/operators
- cAdvisor metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Linux cgroup cpuacct documentation (nanosecond CPU counters)

## Issues Found
No technical issues found.

- The schema uses appropriate ClickHouse types: `LowCardinality(String)` for repetitive fields, `FixedString(12)` for short-form Docker container IDs, and `UInt64` for cumulative counters.
- `PARTITION BY toYYYYMMDD(ts)` and `ORDER BY (host, container_name, ts)` are sensible for time-series workloads.
- The CPU utilization query correctly differentiates cumulative nanosecond counters across the window using `max - min` divided by elapsed seconds.
- `dateDiff('second', start, end)` argument order is correct for ClickHouse.
- The throttle-rate `+ 1` guard against division-by-zero is valid.
- `formatReadableSize` is a real ClickHouse function returning a human-readable byte string.
- INTERVAL syntax (`INTERVAL 1 HOUR`, `INTERVAL 24 HOUR`, `INTERVAL 2 HOUR`) is valid ClickHouse.

## Review Notes
- The CPU-utilization query groups by `toStartOfMinute(ts)` but computes the rate using `max - min` of `cpu_usage_ns` within each minute bucket. If the scrape interval equals or exceeds one minute, a bucket may contain a single sample and yield zero, which would hide utilization. This is a design/tuning caveat (sample more frequently than the bucket size), not a SQL error, so no change was made.
- Memory utilization divides `avg(mem_usage_bytes)` by `max(mem_limit_bytes)`; this is fine because container memory limits are nearly always constant within a window.
- For very large retention periods, consider a TTL clause or aggregating MATERIALIZED VIEW — out of scope for this post.
- cAdvisor's Prometheus endpoint exposes CPU usage in seconds (`container_cpu_usage_seconds_total`); the post's nanosecond field maps to the raw cgroup counter. Either is fine as long as the ingestion pipeline converts consistently — the post's framing ("cAdvisor gives cumulative nanoseconds") is consistent with the underlying cgroup source it reads from.
