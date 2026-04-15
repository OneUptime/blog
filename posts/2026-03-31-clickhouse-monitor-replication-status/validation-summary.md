# Validation Summary: How to Monitor Replication Status in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine, replication subsystem)
- ClickHouse system tables (`system.replicas`, `system.replication_queue`)
- Prometheus (alerting rules, ClickHouse metrics exporter)
- ZooKeeper / ClickHouse Keeper

## Sources Consulted
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse system.replication_queue documentation: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse system.asynchronous_metrics documentation: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse system.metrics documentation: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse SYSTEM SYNC REPLICA documentation: https://clickhouse.com/docs/en/sql-reference/statements/system#sync-replica
- ClickHouse Replication documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse Prometheus integration: https://clickhouse.com/docs/integrations/prometheus

## Issues Found

1. **Incorrect Prometheus metric name `ClickHouseAsyncMetrics_ReplicaDelay`**: The metric `ReplicaDelay` does not exist in `system.asynchronous_metrics`. The correct asynchronous metric for replication delay is `ReplicasMaxAbsoluteDelay`, making the full Prometheus metric name `ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay`. Fixed all occurrences in the metrics list, the Prometheus alert rule expression, and the summary paragraph.

2. **Imprecise description of `absolute_delay`**: The post described `absolute_delay` as "seconds the replica is behind the leader." In ClickHouse, the "leader" concept relates to merge assignment, not data freshness. The `absolute_delay` column measures how many seconds of replication lag the replica currently has (i.e., lag behind the most up-to-date state). Changed the description to "seconds of replication lag the replica currently has."

## Review Notes
- All columns referenced in `system.replicas` queries (`database`, `table`, `is_leader`, `is_readonly`, `total_replicas`, `active_replicas`, `queue_size`, `absolute_delay`, `last_queue_update`, `replica_name`, `zookeeper_exception`) are confirmed to exist in the official documentation.
- All columns referenced in `system.replication_queue` queries (`database`, `table`, `type`, `create_time`, `required_quorum`, `source_replica`, `parts_to_merge`, `num_tries`, `last_exception`) are confirmed to exist.
- The `SYSTEM SYNC REPLICA my_database.my_table` syntax is correct per official docs.
- The three `ClickHouseMetrics_` Prometheus metrics (`ReplicatedChecks`, `ReplicatedFetch`, `ReplicatedSend`) are all valid metrics from `system.metrics`.
- The claim that replicas become read-only when ZooKeeper/Keeper connectivity is lost is accurate per official documentation.
