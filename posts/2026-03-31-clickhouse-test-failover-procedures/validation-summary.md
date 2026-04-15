# Validation Summary: How to Test ClickHouse Failover Procedures

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (system tables, Distributed engine, ReplicatedMergeTree, HTTP interface, CLI client)
- ZooKeeper / ClickHouse Keeper (leader election, four-letter commands)
- HAProxy (load balancing, health checks)
- Linux systemd (service management)
- iptables (network partition simulation)

## Sources Consulted
- ClickHouse documentation on system.replicas table: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse documentation on system.clusters table: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse documentation on system.zookeeper table: https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- ClickHouse documentation on SYSTEM SYNC REPLICA: https://clickhouse.com/docs/en/sql-reference/statements/system#sync-replica
- ClickHouse documentation on Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse documentation on hostName() function: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#hostname
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http
- Apache ZooKeeper administrator's guide (four-letter commands): https://zookeeper.apache.org/doc/current/zookeeperAdmin.html
- iptables man page for INPUT/OUTPUT chain syntax

## Issues Found
No technical issues found.

## Review Notes
- All SQL queries reference valid system table columns (`replica_name`, `is_readonly`, `queue_size`, `log_max_index`, `log_pointer`, `parts_to_check`).
- The `log_max_index - log_pointer` formula for replication lag is a well-known ClickHouse operational pattern.
- The `hostName()` function uses the correct camelCase convention for ClickHouse built-in functions.
- The ZooKeeper `stat` four-letter command and default port 2181 are correct.
- The behavioral claims about Distributed tables skipping failed replicas and reads continuing during ZooKeeper leader election are accurate.
- The post uses placeholder names like `ch-node-2-ip` which is appropriate for a guide — readers are expected to substitute their own values.
- If ClickHouse Keeper is used instead of ZooKeeper, the ZooKeeper-specific commands (e.g., `echo "stat" | nc`) would need adaptation, but the post correctly titles the section "ZooKeeper Leader Failure" so this is not an error.
