# Validation Summary: How to Benchmark SELECT Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (database)
- clickhouse-client CLI
- clickhouse-benchmark CLI
- ClickHouse SQL (EXPLAIN, ALTER TABLE, system tables)
- Bloom filter data skipping indexes

## Sources Consulted
- ClickHouse EXPLAIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system.metrics: https://clickhouse.com/docs/en/operations/system-tables/metrics
- clickhouse-benchmark utility: https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark
- ClickHouse data skipping indexes / bloom_filter: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#data_skipping-indexes
- ClickHouse Null format: https://clickhouse.com/docs/en/interfaces/formats#null

## Issues Found
No technical issues found.

Verified specifically:
- `clickhouse-client --format Null` correctly discards results.
- `EXPLAIN indexes=1 SELECT ...` is valid (PLAN is the default EXPLAIN type, settings can be passed without the explicit PLAN keyword).
- `system.query_log` columns `query`, `query_duration_ms`, `read_rows`, `read_bytes`, `memory_usage`, `type` (with value `'QueryFinish'`), and `event_time` are all correct.
- `clickhouse-benchmark` flags `--iterations`, `--concurrency`, `--query` are valid.
- `ALTER TABLE ... ADD INDEX ... TYPE bloom_filter GRANULARITY 1` followed by `ALTER TABLE ... MATERIALIZE INDEX ...` is the correct pattern for adding and backfilling a data skipping index.
- `system.metrics` entries `Query`, `MemoryTracking`, and `ReadonlyReplica` are valid metric names.

## Review Notes
- The example `clickhouse-benchmark` percentile output is illustrative; actual output also includes additional percentiles (0%, 10%, 25%, 75%, 90%, 99.9%, 99.99%) and queries-per-second numbers, but the snippet shown is a faithful subset.
- `MATERIALIZE INDEX` is asynchronous on a per-part basis when used without `IN PARTITION`; readers running this on very large tables may want to monitor `system.mutations` for completion before re-benchmarking. This is a usability note, not a correctness issue.
- `SET log_queries = 1` is the session-level toggle; on most production deployments query logging is already enabled globally via configuration. This is fine as written.
