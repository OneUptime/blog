# Validation Summary: ClickHouse Monitoring Setup Checklist

## Status
validated

## Post Type
Checklist / Reference Guide

## Technologies Covered
- ClickHouse (server configuration, system tables, HTTP interface)
- Prometheus (scraping, alerting rules)
- Grafana (dashboards)
- curl (health check commands)

## Sources Consulted
- ClickHouse Prometheus protocols documentation — https://clickhouse.com/docs/interfaces/prometheus
- ClickHouse network ports reference — https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse system.metrics documentation — https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse system.events documentation — https://clickhouse.com/docs/operations/system-tables/events
- ClickHouse system.asynchronous_metrics documentation — https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics
- ClickHouse system.processes documentation — https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse system.mutations documentation — https://clickhouse.com/docs/operations/system-tables/mutations
- ClickHouse system.merges documentation — https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse HTTP interface documentation (for /ping endpoint)
- Altinity ClickHouse asynchronous metrics reference — https://kb.altinity.com/altinity-kb-setup-and-maintenance/asynchronous_metrics_descr/

## Issues Found

1. **Wrong default Prometheus port**: The post stated ClickHouse exposes Prometheus metrics on port 8001. The correct default port is **9363**. Fixed in both the prose text and the XML config snippet.

2. **Incorrect metric name `MergesMutationsMemoryUsage`**: The correct metric name in `system.metrics` is **`MergesMutationsMemoryTracking`**, not `MergesMutationsMemoryUsage`. Fixed in the Key Metrics checklist.

3. **Incorrect metric name `SlowReadFromFs`**: There is no profile event called `SlowReadFromFs`. The correct event name is **`SlowRead`** (tracks reads from files that were slow, indicating system overload). Fixed in the Key Metrics checklist.

4. **Incorrect metric name `ReplicaDelay`**: There is no async metric called `ReplicaDelay`. The correct metric for replication lag is **`ReplicasMaxAbsoluteDelay`** (maximum absolute delay across replicas, in seconds). Fixed in the Key Metrics checklist and the replication lag alerting rule.

5. **Incorrect metric name `DiskFree_data`**: There is no `DiskFree` async metric. The correct metric for available disk space is **`DiskAvailable_data`** (following the `DiskAvailable_<disk_name>` naming pattern). Fixed in the Key Metrics checklist and the disk usage alerting rule.

6. **Incorrect metric name `MemoryPhysicalPages`**: There is no async metric called `MemoryPhysicalPages`. The correct metric for total system memory is **`OSMemoryTotal`** (total physical memory in bytes). Fixed in the memory usage alerting rule expression.

## Review Notes
- The XML config omits three additional available Prometheus settings (`errors`, `histograms`, `dimensional_metrics`) which all default to `true`. This is not an error — the config is valid as-is — but users wanting full metric coverage may want to include them.
- The Grafana dashboard ID 14192 is a community dashboard. Users should verify it is compatible with their ClickHouse version.
- The disk metrics (`DiskAvailable_data`, `DiskTotal_data`) assume the disk is named "data". If using the default disk name, the metrics would be `DiskAvailable_default` and `DiskTotal_default`. The post could note this but it is not incorrect as written.
- All SQL queries against system tables (system.processes, system.mutations, system.merges) are correct with valid column names.
- The /ping health check endpoint correctly returns "Ok." (with period).
- The Prometheus alerting rules YAML structure is valid.
