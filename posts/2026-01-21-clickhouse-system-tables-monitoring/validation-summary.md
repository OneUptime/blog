# Validation Summary: How to Monitor ClickHouse Performance with System Tables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse system tables
- ClickHouse SQL
- ClickHouse server configuration
- Prometheus
- Grafana ClickHouse data source

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.parts documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse system.processes documentation: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse system.metrics documentation: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse system.asynchronous_metrics documentation: https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse system.replication_queue documentation: https://clickhouse.com/docs/operations/system-tables/replication_queue
- ClickHouse system.merges documentation: https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse system.mutations documentation: https://clickhouse.com/docs/operations/system-tables/mutations
- ClickHouse system.disks documentation: https://clickhouse.com/docs/operations/system-tables/disks
- ClickHouse system.storage_policies documentation: https://clickhouse.com/docs/operations/system-tables/storage_policies
- ClickHouse Prometheus server settings documentation: https://clickhouse.com/docs/operations/server-configuration-parameters/settings#prometheus
- Grafana ClickHouse query editor macros documentation: https://grafana.com/docs/plugins/grafana-clickhouse-datasource/latest/query-editor/
- ClickHouse CurrentMetrics source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/CurrentMetrics.cpp
- ClickHouse ProfileEvents source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- ClickHouse ServerAsynchronousMetrics source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Interpreters/ServerAsynchronousMetrics.cpp

## Issues Found
- The failed-query examples only filtered `ExceptionWhileProcessing`. ClickHouse also records `ExceptionBeforeStart` for failures that occur before query execution starts, so the failed-query, query-rate, and high-error-rate examples now include both exception event types.
- The uptime/version query selected `VersionInteger` from `system.asynchronous_metrics`, but ClickHouse exposes `VersionInteger` as a current metric in `system.metrics`. The query now reads `Uptime` from `system.asynchronous_metrics` and unions it with `VersionInteger` from `system.metrics`.
- The key-column description called `system.query_log.memory_usage` "Peak memory used." The official documentation describes it as memory consumption by the query, so the wording was adjusted to "Memory used by the query."

## Review Notes
The examples are generally valid for current ClickHouse self-managed deployments. In ClickHouse Cloud or multi-node clusters, many system tables are local to each node, so cluster-wide dashboards may need `clusterAllReplicas` or equivalent aggregation.
