# Validation Summary: How to Plan Shard Count for ClickHouse Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (Distributed engine, ReplicatedMergeTree engine, sharding, replication)
- ClickHouse SQL (DDL for ON CLUSTER, Distributed tables, cityHash64 sharding key)
- Capacity planning concepts (storage-based and ingestion-based shard sizing)

## Sources Consulted
- ClickHouse documentation on Distributed engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse documentation on ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse documentation on cluster DDL (ON CLUSTER): https://clickhouse.com/docs/en/sql-reference/distributed-ddl
- ClickHouse documentation on data replication and sharding architecture: https://clickhouse.com/docs/en/architecture/replication

## Issues Found
- **Storage-Based Shard Count calculation was misleading**: The line `Storage per shard: 4 TB * 2 = 8 TB logical` incorrectly labeled 8 TB as "logical" storage. With a replication factor of 2, each replica stores the same data, so the logical capacity per shard is 4 TB (limited by per-node disk), not 8 TB. The 8 TB figure represents the total physical storage consumed across both replicas. The subsequent formula `ceil(20 / 4) = 5` correctly divides by 4 TB, contradicting the 8 TB on the preceding line. Fixed by replacing the misleading line with `Logical capacity per shard: 4 TB (each replica stores the same data)` and adding a `Total nodes: 5 shards × 2 replicas = 10 nodes` line to clarify the physical resource requirement.

## Review Notes
- The `ReplicatedMergeTree(...)` engine uses an ellipsis placeholder for the zoo_path and replica_name arguments. In modern ClickHouse (20.x+) with ClickHouse Keeper, these can be omitted for automatic path generation. The placeholder is acceptable for a conceptual example.
- The "2-3x slowdown on distributed queries is normal" claim is a reasonable rough guideline, though actual overhead varies significantly based on query type, data distribution, network topology, and result set size.
- The recommended starting points table provides reasonable rough guidelines but actual requirements depend heavily on workload characteristics (column count, query complexity, compression ratio, etc.).
- The `cityHash64(user_id)` sharding key example is a good choice for even distribution, which is the standard ClickHouse recommendation.
