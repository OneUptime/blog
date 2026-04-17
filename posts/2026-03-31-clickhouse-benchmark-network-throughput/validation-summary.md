# Validation Summary: How to Benchmark Network Throughput in ClickHouse Clusters

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse (distributed tables, replication, system tables)
- ClickHouse SQL (DDL/DML, `Distributed` engine, `MergeTree`)
- `clickhouse-client` CLI
- XML cluster configuration (`remote_servers`)
- ProfileEvents: `NetworkReceiveBytes`, `NetworkSendBytes`, `ReadBufferFromS3Bytes`, `WriteBufferToS3Bytes`
- `remote()` table function
- `GLOBAL IN` distributed query optimization

## Sources Consulted
- ClickHouse docs — `system.metric_log`: https://clickhouse.com/docs/en/operations/system-tables/metric_log
- ClickHouse docs — `system.replication_queue`: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse docs — `system.replicated_fetches`: https://clickhouse.com/docs/en/operations/system-tables/replicated_fetches
- ClickHouse docs — `remote()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/remote

## Issues Found

1. **Incorrect `system.metric_log` schema.** The original query selected `metric` and `value` columns with a `WHERE metric IN (...)` filter. `system.metric_log` uses a wide schema by default — each ProfileEvent/CurrentMetric is its own column (e.g. `ProfileEvent_NetworkReceiveBytes`), not a tall `metric`/`value` layout. The tall layout applies to `system.asynchronous_metric_log`, `system.events`, and `system.metrics`, but `NetworkReceiveBytes`/`NetworkSendBytes` are ProfileEvents that only land in `system.metric_log` as wide columns. Rewrote the query to aggregate `max(ProfileEvent_NetworkReceiveBytes)` and `max(ProfileEvent_NetworkSendBytes)` over `toStartOfMinute(event_time)` buckets so it runs correctly.

2. **Invalid columns in `system.replication_queue`.** The original query referenced `bytes_to_download` and `thread_name`, neither of which exist on `system.replication_queue` (which tracks queued tasks in ClickHouse Keeper, not transfer progress). Per-fetch transfer progress is surfaced in `system.replicated_fetches`, which exposes `total_size_bytes_compressed`, `bytes_read_compressed`, `progress`, and `source_replica_hostname`. Switched the query (and the Summary line) to use `system.replicated_fetches` with those real columns.

## Review Notes

- The `remote('node2:9000', default.orders, 'default', '')` syntax is valid — ClickHouse's `remote()` accepts `db.table` as a single argument. The table `default.orders` is unrelated to the `events` tables defined earlier in the post; this is a generic benchmark example and acceptable as written.
- `NetworkReceiveBytes`, `NetworkSendBytes`, `ReadBufferFromS3Bytes`, and `WriteBufferToS3Bytes` are valid ClickHouse ProfileEvent names.
- The `GLOBAL IN` comment ("avoid sending data from all shards for IN filter") is a little loose — `GLOBAL IN` executes the subquery once on the initiator and broadcasts results to shards, which is primarily a correctness tool for distributed subqueries and can either reduce or increase network volume depending on subquery result size. Left as-is since it is a reasonable common-case framing, not a factual error.
- `rand() % 86400` and `now() - rand() % 86400` are syntactically fine; operator precedence resolves to `now() - (rand() % 86400)`.
