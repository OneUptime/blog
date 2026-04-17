# Validation Summary: How to Set Up ClickHouse Alerts for Replication Lag

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- ClickHouse (replicated MergeTree, system tables)
- ClickHouse SQL (DDL, DML, functions)
- ClickHouse `SYSTEM` commands
- `clickhouse-client` CLI
- Prometheus alerting rules (YAML)

## Sources Consulted
- ClickHouse `system.replicas` docs: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `system.replication_queue` docs: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse `SYSTEM` statements: https://clickhouse.com/docs/en/sql-reference/statements/system (SYNC REPLICA)
- ClickHouse conditional functions (`multiIf`): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse date/time functions (`dateDiff`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse other/host functions (`hostName`): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse MergeTree TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse data types (`LowCardinality`, `Float64`, `UInt32`, `DateTime`): https://clickhouse.com/docs/en/sql-reference/data-types
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- `clickhouse-client` docs: https://clickhouse.com/docs/en/interfaces/cli

## Issues Found
No technical issues found.

- All columns used from `system.replicas` (`database`, `table`, `is_leader`, `absolute_delay`, `queue_size`, `active_replicas`, `total_replicas`) exist and have the semantics described.
- `absolute_delay` is correctly described as how many seconds behind the most current replica the replica is.
- All columns used from `system.replication_queue` (`database`, `table`, `create_time`) exist.
- SQL syntax for `CREATE TABLE ... ENGINE = MergeTree ORDER BY (...) TTL ... + INTERVAL 14 DAY` is valid.
- `multiIf`, `hostName()`, `dateDiff('second', ...)`, `count()`, `min()` are all valid ClickHouse functions with correct signatures.
- `SYSTEM SYNC REPLICA mydb.my_table` is a valid statement.
- `clickhouse-client` `--query` and `--host` flags are valid.
- Prometheus alerting rule YAML structure (`groups`, `rules`, `alert`, `expr`, `for`, `labels`, `annotations`) and template variables (`{{ $value }}`, `{{ $labels.X }}`) conform to Prometheus documentation.

## Review Notes
- The Prometheus metric names used (`ClickHouseReplicasAbsoluteDelay`, `ClickHouseReplicasTotalReplicas`, `ClickHouseReplicasActiveReplicas`) are plausible names produced by a custom exporter or label/sanitization layer, but they do not exactly match ClickHouse's built-in `/metrics` endpoint naming (which exposes per-metric families such as `ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay`, `ClickHouseMetrics_*`, `ClickHouseProfileEvents_*`). Readers using ClickHouse's built-in Prometheus endpoint or `prom/clickhouse-exporter` will need to adapt the metric names. This is an illustrative example and not incorrect per se.
- The `is_leader` column still exists in `system.replicas`, but modern ClickHouse uses multi-leader replication and `is_leader` is effectively `1` for all replicas that can execute merges/alters; it is less informative than it once was. Not an error, but worth future clarification.
- `absolute_delay` in `system.replicas` is a `UInt64`; inserting it into a `Float64` column in the alert table works (implicit widening), so no issue.
- `SYSTEM SYNC REPLICA` blocks until the replica catches up; operators should be aware this may block for a long time on heavily lagging replicas. The post reasonably presents it as a runbook step without deep caveats.
