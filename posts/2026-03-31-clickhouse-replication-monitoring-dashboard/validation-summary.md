# Validation Summary: How to Build a ClickHouse Replication Monitoring Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables: `system.replicas`, `system.replication_queue`, `system.part_log`, `system.metrics`)
- ClickHouse replication (ReplicatedMergeTree engine family)
- ZooKeeper / ClickHouse Keeper
- Grafana (alerting thresholds)
- `clusterAllReplicas()` distributed query function

## Sources Consulted
- ClickHouse documentation: `system.replicas` table columns — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse documentation: `system.replication_queue` table — https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse documentation: `system.part_log` table — https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse documentation: `system.metrics` table — https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse documentation: `system.events` table — https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse documentation: `SYSTEM SYNC REPLICA` / `SYSTEM RESTART REPLICA` — https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse documentation: `ALTER TABLE DROP REPLICA` — https://clickhouse.com/docs/en/sql-reference/statements/alter/replica

## Issues Found

1. **Non-existent column `relative_delay` in `system.replicas`**: The first query selected `relative_delay AS relative_lag_seconds` from `system.replicas`, but this column does not exist. Replaced with `queue_size`, which is a valid column that provides useful context about how many operations are pending for a replica. Updated the explanatory text accordingly.

2. **Non-existent columns `last_exception` and `last_exception_time` in `system.replicas`**: The Replication Errors Panel queried `last_exception` and `last_exception_time` from `system.replicas`, but these columns do not exist in that table. The actual exception-related columns in `system.replicas` are `last_queue_update_exception` and `zookeeper_exception`. Fixed the query to use these correct column names and updated the WHERE clause and explanatory text.

3. **`ZooKeeperWaitMicroseconds` is not in `system.metrics`**: The ZooKeeper monitoring query included `ZooKeeperWaitMicroseconds` in a query against `system.metrics`, but this is a cumulative counter that lives in `system.events`, not a gauge metric in `system.metrics`. Replaced with `ZooKeeperSession`, which is a valid gauge metric in `system.metrics` that tracks the number of active ZooKeeper sessions.

4. **Misleading use of `ALTER TABLE DROP REPLICA`**: The recovery section suggested using `ALTER TABLE db.my_table DROP REPLICA 'stuck_replica_name'` to "remove a specific stuck entry" from the replication queue. In reality, `DROP REPLICA` removes the replica's metadata from ZooKeeper entirely — it is a destructive operation, not a queue management command. Replaced with `SYSTEM RESTART REPLICA db.my_table`, which resets the replica's replication state and retries stuck queue entries, which is the correct approach for handling stuck replication queues.

## Review Notes
- The `system.part_log` query for replication throughput using `event_type = 'DownloadPart'` is correct and a good approach.
- The Grafana alert thresholds are reasonable starting points for production clusters.
- The `clusterAllReplicas()` function usage is correct throughout the post for collecting metrics across all nodes.
- The `SYSTEM SYNC REPLICA` command for manual catch-up is correct.
- The Replication Queue Depth query is well-structured and uses valid columns from `system.replication_queue`.
