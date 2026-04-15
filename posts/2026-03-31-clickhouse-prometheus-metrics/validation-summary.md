# Validation Summary: How to Configure Prometheus Metrics Export from ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (server configuration, system tables)
- Prometheus (scrape configuration, PromQL, alerting rules)
- Grafana (mentioned for dashboards)
- Alertmanager (mentioned for alerting)

## Sources Consulted
- ClickHouse Prometheus interface docs: https://clickhouse.com/docs/en/interfaces/prometheus
- ClickHouse system.metrics table docs: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse system.asynchronous_metrics table docs: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse system.events table docs: https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse output formats docs: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse server configuration parameters: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings

## Issues Found

1. **Invalid `<status_info>` config option**: The `<status_info>true</status_info>` element in the Prometheus XML configuration is not a valid ClickHouse option. The documented options are `metrics`, `events`, `asynchronous_metrics`, `errors`, `histograms`, and `dimensional_metrics`. Removed the invalid line.

2. **Wrong metric prefix for MarkCacheBytes**: `ClickHouseAsyncMetrics_MarkCacheBytes` was incorrect — `MarkCacheBytes` is in `system.metrics`, not `system.asynchronous_metrics`. Changed to `ClickHouseMetrics_MarkCacheBytes`.

3. **Non-existent event `QueryTimeMicroseconds`**: The event `ClickHouseEvents_QueryTimeMicroseconds` does not exist. ClickHouse provides `SelectQueryTimeMicroseconds` and `InsertQueryTimeMicroseconds` instead. Changed to `SelectQueryTimeMicroseconds`. Also corrected the misleading comment from "Slow query rate (queries taking > 1 second)" to "Total SELECT query processing time in seconds per second", since `rate(TimeMicroseconds) / 1e6` gives cumulative processing time rate, not a count of slow queries.

4. **Wrong metric for parts count**: `ClickHouseAsyncMetrics_NumberOfTables` was labeled "Parts count across all tables" but it actually counts the number of tables, not parts. Replaced with `ClickHouseMetrics_PartsActive` which tracks the number of active data parts, which is relevant to the "Merges" section.

5. **Misleading replication metric**: `ClickHouseMetrics_ReplicatedChecks` was labeled "Replication queue depth" but it actually measures the number of data parts being checked for consistency, not the queue depth. Replaced with `ClickHouseAsyncMetrics_ReplicasSumQueueSize` for actual replication queue size. Also clarified the comment on `ReplicasMaxAbsoluteDelay` to "Maximum replication delay in seconds".

## Review Notes
- The `FORMAT Prometheus` output format used in the alternative HTTP interface section was verified to be a valid ClickHouse output format.
- The S3 metric names (`ReadBufferFromS3Bytes`, `S3ReadRequestsCount`) exist in ClickHouse but may vary across versions. Some versions use `DiskS3*` prefixed equivalents. These were left as-is since they are valid in many ClickHouse deployments.
- The `MarkCacheHits` and `MarkCacheMisses` events used in the cache hit rate formula are well-established ClickHouse events and were verified to be correct.
- The Prometheus scrape configuration and alerting rules follow correct Prometheus YAML syntax and use valid PromQL expressions.
- The `systemctl reload clickhouse-server` command may not pick up Prometheus port changes — a full restart (`systemctl restart clickhouse-server`) may be needed for port binding changes, though `reload` works for many configuration changes.
