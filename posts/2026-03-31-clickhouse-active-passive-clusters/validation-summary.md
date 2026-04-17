# Validation Summary: How to Set Up Active-Passive ClickHouse Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server, clickhouse-client)
- ClickHouse Keeper (Raft-based coordination)
- ReplicatedMergeTree table engine
- Distributed table engine
- ZooKeeper (mentioned as alternative)

## Sources Consulted
- ClickHouse Keeper configuration reference: https://clickhouse.com/docs/en/operations/clickhouse-keeper
- ReplicatedMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- system.replicas table reference: https://clickhouse.com/docs/en/operations/system-tables/replicas
- clickhouse-client CLI reference: https://clickhouse.com/docs/en/interfaces/cli

## Issues Found
- The Keeper configuration snippet hardcoded `<server_id>1</server_id>` while instructing the reader to "Add to `config.xml` on all nodes." The `server_id` must be unique per node and match the id declared in the raft configuration for that host. Updated the surrounding sentence to clarify that `<server_id>` must be set to each node's own id (`1` on `ch-node-1`, `2` on `ch-node-2`).

## Review Notes
- The ReplicatedMergeTree path `/clickhouse/tables/default/orders` is hardcoded. In multi-shard production setups, ClickHouse convention is to use macros like `/clickhouse/tables/{shard}/{database}/{table}`, but the hardcoded form is valid for the simple two-node active-passive example shown here.
- The replication lag expression `log_max_index - log_pointer` is accurate (number of unapplied log entries). `absolute_delay` from `system.replicas` is an alternative that reports the lag in seconds; either works for failover readiness checks.
- The `Distributed` engine signature `Distributed(cluster, database, table, sharding_key)` is correct. For a true active-passive, the `remote_servers` cluster definition (not shown) would list both replicas within a single `<shard>` with `<internal_replication>true</internal_replication>`, which the post mentions explicitly.
- The post describes failover as largely manual (redirecting the application to the standby); the introductory "takes over automatically" phrasing is slightly stronger than the actual content, but the Summary section accurately clarifies this. Left as-is since it is not technically incorrect.
