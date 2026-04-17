# Validation Summary: How to Add a New Shard to a ClickHouse Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server, clustering, sharding)
- ClickHouse `ReplicatedMergeTree` and `Distributed` table engines
- ClickHouse system tables (`system.parts`)
- ClickHouse cluster table functions (`clusterAllReplicas`)
- XML server configuration (`macros.xml`, `remote_servers`)
- Systemd service management

## Sources Consulted
- ClickHouse docs: Configuration files (https://clickhouse.com/docs/operations/configuration-files)
- ClickHouse docs: Server configuration parameters — macros & remote_servers (https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- ClickHouse docs: Data replication / ReplicatedMergeTree (https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication)
- ClickHouse docs: Distributed engine (https://clickhouse.com/docs/engines/table-engines/special/distributed)
- ClickHouse docs: `cluster` / `clusterAllReplicas` table functions (https://clickhouse.com/docs/sql-reference/table-functions/cluster)
- ClickHouse docs: `system.parts` (https://clickhouse.com/docs/operations/system-tables/parts)
- ClickHouse docs: Cluster deployment architecture (https://clickhouse.com/docs/architecture/cluster-deployment)

## Issues Found
1. **Incorrect reload command.** The original Step 2 instructed users to run `sudo systemctl reload clickhouse-server`. ClickHouse auto-detects changes in configuration files (cluster, users, settings) and reloads on the fly; the `systemctl reload` action is not guaranteed to be defined for `clickhouse-server.service`. Replaced with a note that ClickHouse auto-reloads and a pointer to the canonical `SYSTEM RELOAD CONFIG ON CLUSTER my_cluster;` SQL statement, per the official Configuration Files docs.

## Review Notes
- The `<macros>` format, `<remote_servers>` structure, `ReplicatedMergeTree` ZooKeeper path pattern, `Distributed(...)` engine signature, `clusterAllReplicas(...)` signature, and the referenced `system.parts` columns are all correct.
- `DROP TABLE ... ON CLUSTER` on a Distributed table only removes the Distributed view; the underlying local tables are unaffected. The post does this intentionally before recreating the Distributed table, which is fine.
- A common alternative ZooKeeper path convention is `/clickhouse/tables/{shard}/{database}/{table}`, which avoids collisions when multiple databases share a table name. The form used in the post is still valid and matches many official examples.
- The post correctly notes that historical data is not automatically rebalanced when a new shard is added — that remains true and is an important caveat.
