# Validation Summary: How to Set Up Active-Active ClickHouse Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, Distributed table engine)
- ZooKeeper / ClickHouse Keeper
- ClickHouse SQL DDL
- ClickHouse server configuration (config.xml, remote_servers)

## Sources Consulted
- ClickHouse remote_servers configuration: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#server_settings_remote_servers
- ReplicatedMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- system.replicas system table: https://clickhouse.com/docs/en/operations/system-tables/replicas

## Issues Found
No technical issues found.

## Review Notes
- The `<remote_servers>` XML structure, port 9000 (native TCP), and nested `<shard>`/`<replica>` layout are all correct.
- `ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')` uses the standard macro-substitution pattern; the post correctly notes that `{shard}` and `{replica}` must be defined in each server's macros config.
- `CREATE TABLE ... ON CLUSTER ... AS events_local ENGINE = Distributed(...)` is valid DDL syntax.
- Using `currentDatabase()` as the Distributed engine's database parameter works (evaluated at DDL time), though the more conventional form is an empty string `''` meaning "same database as the Distributed table." This is a style choice, not an error.
- `sipHash64(id)` is a valid sharding-key expression (any UInt64-returning expression works).
- All columns referenced in `system.replicas` (`database`, `table`, `is_leader`, `total_replicas`, `active_replicas`, `is_readonly`) exist. Note that `is_leader` has become largely vestigial since ClickHouse 20.6 introduced multi-leader replication — it typically returns 1 for all replicas now and is not a useful health signal. Future revisions might swap it for fields like `absolute_delay` or `queue_size` for more meaningful replication-lag monitoring.
- The insert-flow description ("Each node writes to its local replica and replicates to the other replica in the same shard") is accurate: the Distributed table routes rows per the sharding key to one replica per target shard, then ReplicatedMergeTree handles intra-shard replication via Keeper.
- The post uses the term "active-active" consistent with how it's commonly applied to ClickHouse — in practice, any ReplicatedMergeTree cluster already allows reads and writes on every replica, so this setup is the standard ClickHouse HA deployment.
