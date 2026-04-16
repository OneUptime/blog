# Validation Summary: How to Use internal_replication Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse cluster configuration (`remote_servers` / `cluster.xml`)
- ClickHouse `Distributed` table engine
- ClickHouse `ReplicatedMergeTree` table engine
- ClickHouse `system.replicas` and `clusterAllReplicas` table function
- ClickHouse Keeper / ZooKeeper (for replication coordination)

## Sources Consulted
- ClickHouse Distributed engine docs: https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse Replication docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse `system.replicas` reference: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse Architecture / Replication docs: https://clickhouse.com/docs/architecture/replication

## Issues Found
1. **Incorrect columns referenced in `system.replicas` query.** The "Verifying Insert Behavior" section queried `replica_name, total_marks, data_uncompressed_bytes FROM system.replicas`. The columns `total_marks` and `data_uncompressed_bytes` do not exist in `system.replicas` — they live in `system.parts` (and `data_uncompressed_bytes` also in `system.tables`). Replaced with a `clusterAllReplicas`-based query that groups row counts per `hostName()`, which actually shows where data landed across replicas and matches the section's stated intent.

## Review Notes
- Default value of `internal_replication` (`false`) is verified against official docs.
- Behavior descriptions for `true`/`false` are accurate.
- `cluster.xml` configuration hierarchy (`<remote_servers>` → cluster → `<shard>` → `<internal_replication>` + `<replica>`) is correct, including the native TCP port `9000`.
- `ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')` macro syntax is correct (resolved from server `<macros>` config).
- `Distributed('cluster', 'database', 'table', sharding_key)` signature with `intHash64(user_id)` is valid.
- The "Common Mistake" warning is accurate guidance — pairing `internal_replication = true` with non-replicated `MergeTree` tables breaks replication.
