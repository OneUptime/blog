# Validation Summary: How to Monitor Replication Lag in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (system tables: replicas, replication_queue, events, text_log, asynchronous_metric_log, zookeeper)
- Prometheus (metrics scraping and alerting rules)
- Bash scripting (monitoring script with clickhouse-client)
- ZooKeeper / ClickHouse Keeper

## Sources Consulted
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse system.replication_queue documentation: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse system.events documentation: https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse system.text_log documentation: https://clickhouse.com/docs/en/operations/system-tables/text_log
- ClickHouse system.asynchronous_metrics documentation: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse system.asynchronous_metric_log documentation: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metric_log
- ClickHouse system.metric_log documentation: https://clickhouse.com/docs/en/operations/system-tables/metric_log
- ClickHouse system.metrics documentation: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse Prometheus interface documentation: https://clickhouse.com/docs/en/interfaces/prometheus

## Issues Found

1. **`fetch_started_time` column does not exist in `system.replication_queue`**: The query in the "Watching the Replication Queue" section selected `fetch_started_time`, which is not a documented column. Removed it from the SELECT list.

2. **Wrong Prometheus metric prefixes for asynchronous metrics**: `ReplicasMaxQueueSize` and `ReplicasMaxAbsoluteDelay` are asynchronous metrics (from `system.asynchronous_metrics`), not regular metrics (from `system.metrics`). Changed the Prometheus metric name prefix from `ClickHouseMetrics_` to `ClickHouseAsyncMetrics_` for both. `ReadonlyReplica` is correctly a regular metric and was left unchanged.

3. **`ProfileEvents` column does not exist on `system.replicas`**: The "Checking Replication Speed" query referenced `ProfileEvents['ReplicatedPartFetches']` on `system.replicas`, but this table has no such column. `ProfileEvents` maps exist on tables like `system.query_log`, not `system.replicas`. Removed the non-existent column from the query.

4. **`system.events` has no `event_time` column**: The query against `system.events` selected `event_time` and used `ORDER BY event_time DESC LIMIT 10`, but `system.events` only has three columns: `event` (aliased as `name`), `value`, and `description`. It stores cumulative counters since server start, not timestamped events. Fixed the query to select only `event` and `value`, removed the invalid ORDER BY and LIMIT. Also corrected the preceding text from "check the current fetch speed in bytes" to "check the cumulative replication event counters since server start."

5. **metric_log section used wrong table and wrong column names**: `ReplicasMaxAbsoluteDelay` and `ReplicasSumQueueSize` are asynchronous metrics stored in `system.asynchronous_metric_log`, not `system.metric_log`. The `metric_log` table stores metrics from `system.metrics` and `system.events` only. Changed the section to use `system.asynchronous_metric_log` with its correct row-based schema (`metric`/`value` columns) and `avgIf()` aggregation pattern.

6. **Wrong "check if enabled" query for metric_log**: The original query `SELECT name, value FROM system.settings WHERE name = 'log_queries'` checks whether query logging is enabled, not metric logging. Replaced with a query that checks whether the `asynchronous_metric_log` table exists: `SELECT count() FROM system.tables WHERE database = 'system' AND name = 'asynchronous_metric_log'`.

## Review Notes
- The alerting thresholds section (absolute_delay ranges) presents reasonable operational guidance but the values will vary by workload. This is appropriately framed as "typical thresholds" rather than absolutes.
- The shell script uses `clickhouse-client --port 9000` which is the native TCP port, correct for the native client.
- The ZooKeeper path `/clickhouse` in the diagnostic query may vary by installation. Users should substitute their actual ClickHouse ZooKeeper path prefix.
