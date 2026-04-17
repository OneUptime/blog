# Validation Summary: How to Debug ClickHouse Distributed Query Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (distributed queries, system tables, EXPLAIN, session settings)
- SQL

## Sources Consulted
- ClickHouse Settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- `system.clusters`: https://clickhouse.com/docs/en/operations/system-tables/clusters
- `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- `clusterAllReplicas` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- `EXPLAIN` statement: https://clickhouse.com/docs/en/sql-reference/statements/explain
- `skip_unavailable_shards` setting: https://clickhouse.com/docs/en/operations/settings/settings#skip_unavailable_shards

## Issues Found
1. **"Enable Full Error Propagation" section was factually wrong.** The original post asserted that setting `distributed_connections_pool_size`, `receive_timeout`, and `send_timeout` causes "the full exception from the remote shard" to appear. These settings tune the connection pool and network socket timeouts — they have no effect on error verbosity. Remote shard errors already propagate to the coordinator by default. Replaced the section with "Get Verbose Logs From Remote Shards" that correctly uses `send_logs_level` (the actual setting that controls log-streaming verbosity) and lists its valid values.

2. **Operator-precedence bug in the `system.query_log` example.** The WHERE clause `has(tables, 'my_database.distributed_table') AND type = 'ExceptionBeforeStart' OR type = 'ExceptionWhileProcessing' AND event_time > now() - INTERVAL 1 HOUR` binds AND tighter than OR, so it parses as `(has(...) AND type='ExceptionBeforeStart') OR (type='ExceptionWhileProcessing' AND event_time > ...)`, which is not what the reader wants. Replaced with `type IN ('ExceptionBeforeStart', 'ExceptionWhileProcessing')` which both fixes the logic and reads more clearly.

3. **`EXPLAIN PIPELINE` description was misleading.** The post claimed it "shows how the query is split across shards." `EXPLAIN PIPELINE` shows the local execution pipeline on whichever node runs the EXPLAIN — on the coordinator it surfaces the `Remote` processors that fan out to shards, but it does not show per-shard execution plans. Rewrote the caption to describe what it actually shows and pointed at `EXPLAIN PLAN` for plan inspection.

## Review Notes
- `system.clusters` columns (`cluster`, `shard_num`, `host_name`, `errors_count`, `estimated_recovery_time`) all exist and are correctly used.
- `system.query_log` has a `hostname` column in current ClickHouse versions; `ExceptionBeforeStart` and `ExceptionWhileProcessing` are valid `type` values.
- `clusterAllReplicas('cluster', 'db', 'table')` and `clusterAllReplicas('cluster', system.columns)` are both valid documented forms.
- `skip_unavailable_shards = 1`, `log_queries = 1`, `log_query_threads = 1` are all current and correctly used.
- Readers running very old ClickHouse (<21.x) may not see the `hostname` column in `system.query_log`; on modern versions it is present.
