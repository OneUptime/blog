# Validation Summary: How to Shard Data Across ClickHouse Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Distributed table engine
- ReplicatedMergeTree
- ClickHouse cluster configuration
- ClickHouse Keeper / ZooKeeper-backed replication
- Distributed queries, sharding keys, shard weights, and shard rebalancing

## Sources Consulted
- ClickHouse Docs: Distributed table engine - https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse Docs: Table shards and replicas - https://clickhouse.com/docs/shards
- ClickHouse Docs: Distributed DDL queries / ON CLUSTER - https://clickhouse.com/docs/sql-reference/distributed-ddl
- ClickHouse Docs: Replicated table engines - https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse Docs: Manipulating partitions and parts - https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse Docs: Rebalancing data - https://clickhouse.com/docs/guides/sre/scaling-clusters
- ClickHouse Docs: system.clusters - https://clickhouse.com/docs/operations/system-tables/clusters
- ClickHouse Docs: cluster and clusterAllReplicas table functions - https://clickhouse.com/docs/sql-reference/table-functions/cluster
- ClickHouse Docs: system.query_log - https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse Docs: Session settings, including optimize_skip_unused_shards - https://clickhouse.com/docs/operations/settings/settings
- ClickHouse Docs: RENAME statement - https://clickhouse.com/docs/sql-reference/statements/rename

## Issues Found
- The local table creation comment said to run an `ON CLUSTER` DDL on all nodes. Changed it to say the command is run once from any node because `ON CLUSTER` distributes the DDL to cluster hosts.
- The cluster verification query only read `system.clusters`, which verifies configuration but not reachability. Replaced the reachability check with a `clusterAllReplicas(..., system.one)` query.
- The data distribution query counted parts rather than rows. Changed `count()` to `sum(rows)` when querying `system.parts`.
- The "sequential ID" bad sharding key explanation incorrectly said all inserts go to one shard. ClickHouse routes by the remainder of the sharding expression, so the text now warns that sequential IDs can scatter related rows for user-centric queries.
- The direct-to-shard insert examples used `cityHash64(user_id) % 3` even though the distributed table's sharding key was `user_id`. Changed the predicates to `user_id % 3` so the manual routing matches the defined sharding expression for equal-weight shards.
- The single-shard routing example implied ClickHouse always skips unused shards for sharding-key filters. Added `SET optimize_skip_unused_shards = 1` and softened the wording because this optimization depends on the setting and on data matching the sharding key.
- The rebalance example used invalid `ALTER TABLE ... MOVE PARTITION ... TO SHARD` syntax. Replaced it with the supported replicated-table `FETCH PARTITION` plus `ATTACH PARTITION` flow and noted that source cleanup should happen only after verification.
- The resharding example referenced `tenant_id`, which was not in the table schema, and created the distributed table before the local target table. Changed it to create `events_local_new` first and use `cityHash64(user_id, event_type)` as the new sharding key.
- The rows-per-shard monitoring query selected `shard_num` from `system.parts`, where it is not a table column. Changed it to use the distributed virtual column `_shard_num`, and changed `clusterAllReplicas` to `cluster` to avoid counting every replica.
- The cluster design best practice said to start with three shards because of consensus. ClickHouse shard count is not a consensus mechanism, so the recommendation now says to choose shard count based on data volume, query load, and growth.

## Review Notes
- The examples assume self-managed ClickHouse. ClickHouse Cloud has different guidance for Distributed tables and uses cloud-specific architecture.
- The partition move example is intentionally conservative. Rebalancing existing data in ClickHouse remains a manual operational process, and whole-partition movement should be planned carefully when shard-pruning optimizations are used.
