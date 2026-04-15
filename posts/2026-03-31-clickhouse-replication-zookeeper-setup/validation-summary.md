# Validation Summary: How to Set Up ClickHouse Replication with ZooKeeper

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine, Distributed tables, system.replicas)
- Apache ZooKeeper (ensemble setup, configuration, leader election)
- Linux systemd (systemctl for service management)

## Sources Consulted
- ClickHouse official documentation on replication: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse official documentation on ZooKeeper configuration: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#zookeeper
- ClickHouse official documentation on cluster configuration (remote_servers): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#remote-servers
- ClickHouse official documentation on macros: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#macros
- ClickHouse official documentation on system.replicas: https://clickhouse.com/docs/en/operations/system-tables/replicas
- Apache ZooKeeper Administrator's Guide: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html

## Issues Found
No technical issues found.

## Review Notes
- The post uses `systemctl reload clickhouse-server` in Step 5. While ClickHouse does handle SIGHUP by reloading config files, for a first-time setup where ZooKeeper connection parameters are being added, `systemctl restart clickhouse-server` may be more reliable to ensure the ZooKeeper connection is fully established. This is not incorrect but worth noting.
- The `<root>/clickhouse</root>` in the ZooKeeper config combined with the ReplicatedMergeTree path `/clickhouse/tables/{shard}/events` results in the actual ZooKeeper znode path being `/clickhouse/clickhouse/tables/{shard}/events`. This is functional and transparent to ClickHouse users (the path shown in `system.replicas` excludes the root prefix), but a slightly cleaner convention would be to use `/tables/{shard}/events` as the engine path when using a root prefix. This is a style preference, not an error.
- The macros example shows configurations for ch1, ch2, and ch3 but omits ch4 (shard 2, replica 2). The pattern is clear enough that readers can extrapolate, but completeness could be improved.
- Modern ClickHouse (21.12+) includes ClickHouse Keeper as a built-in alternative to ZooKeeper. The post focuses exclusively on ZooKeeper, which remains a valid and widely used option, but readers should be aware of the alternative.
- The claim that missing `<internal_replication>true` causes duplicates is a common simplification. In practice, ReplicatedMergeTree's block-level deduplication often prevents exact duplicates, but omitting `internal_replication` is still incorrect practice as it causes redundant writes and can lead to edge-case inconsistencies.
