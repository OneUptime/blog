# Validation Summary: How to Monitor ClickHouse ZooKeeper Latency

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (system tables: `system.zookeeper`, `system.metrics`, `system.events`, `system.zookeeper_log`, `system.asynchronous_metrics`, `system.replicas`)
- Apache ZooKeeper (4-letter commands, server-side monitoring)
- ClickHouse Keeper
- Prometheus (alerting rules for ClickHouse metrics)

## Sources Consulted
- ClickHouse official docs: system.zookeeper table — https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- ClickHouse official docs: system.zookeeper_log table — https://clickhouse.com/docs/en/operations/system-tables/zookeeper_log
- ClickHouse official docs: system.events table — https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse official docs: system.asynchronous_metrics — https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse official docs: system.replicas — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse source code: ProfileEvents.cpp (for event name verification)
- ClickHouse source code: PrometheusMetricsWriter.cpp (for Prometheus metric name format)
- Apache ZooKeeper Admin Guide — https://zookeeper.apache.org/doc/current/zookeeperAdmin.html

## Issues Found

1. **`ZooKeeperExceptions` event does not exist**: The post listed `ZooKeeperExceptions` as a key event to watch. ClickHouse does not have a single `ZooKeeperExceptions` event — it splits exceptions into three separate events: `ZooKeeperUserExceptions`, `ZooKeeperHardwareExceptions`, and `ZooKeeperOtherExceptions`. Fixed the key events list to reference all three actual events.

2. **`elapsed_microseconds` column does not exist in `system.zookeeper_log`**: The query computing `avg(elapsed_microseconds)` and `max(elapsed_microseconds)` referenced a non-existent column. The `system.zookeeper_log` table does not have a latency/duration column. Removed the latency computation lines from the query, keeping the valid operations and error count aggregations.

3. **`ZooKeeperReadLatencyUs` and `ZooKeeperWriteLatencyUs` async metrics do not exist**: The post claimed these metrics exist in `system.asynchronous_metrics`. They do not — the only documented ZooKeeper-related async metric is `ZooKeeperClientLastZXIDSeen`. Updated the section to remove the incorrect metric names.

4. **Prometheus alert referenced non-existent metrics**: The `ClickHouseAsyncMetrics_ZooKeeperReadLatencyUs` metric does not exist (because the underlying async metric doesn't exist). The `ClickHouseProfileEvents_ZooKeeperExceptions_total` metric does not exist (because the underlying event doesn't exist). Replaced the alerts with correct metric references: summing the three actual exception events for the exceptions alert, and added a replication queue alert as a practical alternative to the removed latency alert.

## Review Notes
- The ZooKeeper 4-letter commands (`mntr`, `srvr`) section is correct, though since ZooKeeper 3.5.3, these commands must be explicitly whitelisted via `4lw.commands.whitelist` in `zoo.cfg`. The docs also note that 4-letter words are being deprecated in favor of the AdminServer HTTP API. A future update could mention this caveat.
- The `system.zookeeper WHERE path = '/'` query and `system.replicas` query are both correct with valid column names.
- The Prometheus metric naming convention (`ClickHouseProfileEvents_`, `ClickHouseMetrics_`, `ClickHouseAsyncMetrics_`) is correct per the ClickHouse source.
