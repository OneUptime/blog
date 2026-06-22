# Validation Summary: How to Troubleshoot ClickHouse Replication Lag

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- ClickHouse
- ReplicatedMergeTree replication
- ClickHouse Keeper
- Apache ZooKeeper
- Prometheus
- Grafana
- Linux networking and service commands

## Sources Consulted
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse system.replication_queue documentation: https://clickhouse.com/docs/operations/system-tables/replication_queue
- ClickHouse system.replicated_fetches documentation: https://clickhouse.com/docs/operations/system-tables/replicated_fetches
- ClickHouse system.zookeeper documentation: https://clickhouse.com/docs/operations/system-tables/zookeeper
- ClickHouse system.parts documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse SYSTEM statements documentation: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse ALTER PARTITION documentation: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse server settings documentation: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse Prometheus protocols documentation: https://clickhouse.com/docs/interfaces/prometheus
- ClickHouse asynchronous inserts documentation: https://clickhouse.com/docs/optimize/asynchronous-inserts
- Apache ZooKeeper Administrator's Guide, four-letter-word commands: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html

## Issues Found
- The ZooKeeper error query selected and filtered on a non-existent `exception` column in `system.replication_queue`. Changed it to use the documented `last_exception` column.
- The ZooKeeper diagnostic query was described as checking session state, but `system.zookeeper` reads Keeper/ZooKeeper node data for a specified path. Updated the comment to say it checks replication metadata.
- The large-transfer query used a non-existent `bytes_to_merge` column in `system.replication_queue`. Replaced it with `system.replicated_fetches`, which exposes currently running fetch size and progress fields.
- The recovery section said `SYSTEM RESTART REPLICA` removes stuck queue entries. Updated the comment to describe its documented behavior: reinitializing the replica queue from Keeper/ZooKeeper state.
- The `ALTER TABLE ... FETCH PARTITION` example implied the fetched partition becomes active immediately and clears local data. Added the required `ATTACH PARTITION` step and corrected the description.
- The `SYSTEM RESTORE REPLICA` example was described as a full data resync. Updated it to match ClickHouse documentation: restoring replica metadata after Keeper/ZooKeeper metadata loss on readonly replicated tables.
- The corrupt-replica recovery command used the older `/var/lib/clickhouse/data/default/events` path as a universal path. Updated it to identify the actual table path via `system.parts` and use `force_restore_data` for semi-automatic recovery when local data differs too much from Keeper metadata.
- The Prometheus alert rules used metric names that are not documented as built-in ClickHouse Prometheus metrics. Reworded the example as rules for an exported `replication_health` view and changed the metric names accordingly.
- The Grafana query claimed to produce a time series from `system.replicas` by wrapping current values with `now()`. Replaced it with a current-state panel query.
- The replication bandwidth settings were shown at the root config level even though the documented table-level settings belong under the `merge_tree` configuration section. Wrapped them in `<merge_tree>`.

## Review Notes
The post is now technically consistent with current ClickHouse documentation. Prometheus replication-lag alerting still depends on exporting `system.replicas` or the provided `replication_health` view through a custom exporter or handler, because ClickHouse's built-in Prometheus endpoint primarily exposes system metrics/events/asynchronous metrics rather than arbitrary system table query results.
