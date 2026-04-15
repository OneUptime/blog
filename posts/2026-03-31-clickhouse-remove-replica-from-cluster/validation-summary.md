# Validation Summary: How to Remove a Replica from a ClickHouse Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ZooKeeper / ClickHouse Keeper
- ClickHouse cluster configuration (remote_servers)
- SYSTEM DROP REPLICA statement
- system.replicas system table
- clickhouse-keeper-client CLI

## Sources Consulted
- ClickHouse SYSTEM statements documentation: https://clickhouse.com/docs/en/sql-reference/statements/system#drop-replica
- ClickHouse system.replicas table documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse configuration files documentation: https://clickhouse.com/docs/en/operations/configuration-files

## Issues Found

### 1. Incorrect step ordering: SYSTEM DROP REPLICA run before stopping the departing node
- **What was wrong:** The original post ran `SYSTEM DROP REPLICA` in Step 3 while the ClickHouse service on the departing node was still running (shutdown was Step 5). According to official docs, `SYSTEM DROP REPLICA` only works on inactive/stale replicas and cannot drop an active replica.
- **What was changed:** Moved the service shutdown step (stop and disable clickhouse-server) to Step 3, before the `SYSTEM DROP REPLICA` step (now Step 4). Updated the summary paragraph to reflect the correct ordering.

### 2. Incorrect WHERE clause in batch drop query
- **What was wrong:** The query to generate per-table DROP REPLICA commands used `WHERE replica_path LIKE '%ch-node-02%'`. The `replica_path` column in `system.replicas` contains the ZooKeeper path for the *current* node's replica only (it is `zookeeper_path/replicas/replica_name` for the local node). When run on an active node like ch-node-01, this filter would match nothing because the path would contain `ch-node-01`, not `ch-node-02`.
- **What was changed:** Removed the incorrect WHERE clause. The query now generates commands for all replicated tables, which is the intended behavior when decommissioning a replica.

### 3. Simpler SYSTEM DROP REPLICA syntax not shown
- **What was wrong:** The post only showed the per-table syntax (`SYSTEM DROP REPLICA ... FROM TABLE`). ClickHouse supports `SYSTEM DROP REPLICA 'replica_name'` without a FROM clause, which drops the replica from all replicated tables at once.
- **What was changed:** Added the simpler `SYSTEM DROP REPLICA 'ch-node-02'` syntax as the primary recommended approach, with the per-table variant shown as an alternative.

## Review Notes
- The `replica_name` used in `SYSTEM DROP REPLICA` must match the actual replica name in ZooKeeper, which is typically set via the `{replica}` macro in ClickHouse configuration. The post assumes it matches the hostname (`ch-node-02`), which is common practice but may differ in custom configurations.
- The `systemctl reload clickhouse-server` command works if the systemd unit defines ExecReload. ClickHouse also auto-detects config file changes without requiring an explicit reload signal.
- The verification query on `system.replicas` shows replica info from the perspective of the current node. The `total_replicas` column decreasing confirms successful removal. For definitive verification, the ZooKeeper path check shown in the post is the most reliable approach.
