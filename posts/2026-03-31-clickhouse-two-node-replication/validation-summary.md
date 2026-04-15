# Validation Summary: How to Set Up Two-Node ClickHouse Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ReplicatedMergeTree engine
- ClickHouse Keeper (ZooKeeper-compatible coordination)
- Distributed DDL (ON CLUSTER)
- Quorum inserts

## Sources Consulted
- [Replicated table engines | ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication)
- [Network ports | ClickHouse Docs](https://clickhouse.com/docs/guides/sre/network-ports)
- [Cluster deployment | ClickHouse Docs](https://clickhouse.com/docs/architecture/cluster-deployment)
- [system.replicas | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/replicas)
- [ClickHouse Settings.h source code](https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.h) — for insert_quorum_timeout unit confirmation
- [Custom Partitioning Key | ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key)
- [Distributed DDL Queries | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/distributed-ddl)

## Issues Found
- **Incorrect `is_leader` description (line 81):** The original text stated "Both replicas should appear with `is_leader = 1` on one node." This was misleading for two reasons: (1) querying `system.replicas` on a node only shows that node's local replicas, not all replicas in the cluster; (2) multiple replicas can be leaders simultaneously in ClickHouse — the leader role determines which replica schedules background merges, not write routing. Fixed to: "Each node should show its local replica with `is_leader = 1` (multiple replicas can be leaders simultaneously) and `queue_size = 0` once sync completes."

## Review Notes
- The `insert_quorum_timeout` value of 10000 ms (10 seconds) is correct but aggressive compared to the default of 600000 ms (10 minutes). Under brief network blips this could cause unnecessary insert failures. The blog's value is not wrong, just worth noting for production use.
- Production configurations often include `<internal_replication>true</internal_replication>` inside the `<shard>` block when using ReplicatedMergeTree. The blog omits this, which is acceptable since it defaults to `false` and is mainly relevant for Distributed engine routing behavior, but it would be a useful addition for a more complete guide.
- The two-parameter form of ReplicatedMergeTree used in the post is fully supported. A newer zero-argument form exists that uses server-configured defaults, but the explicit form is not deprecated.
