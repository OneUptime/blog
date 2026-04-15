# How to Use Shared Merge Tree Engine in ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SharedMergeTree, ClickHouse Cloud, Storage, Scalability

Description: Learn how SharedMergeTree works in ClickHouse Cloud, replacing ReplicatedMergeTree to enable unlimited horizontal scaling with shared object storage.

---

SharedMergeTree is the default table engine in ClickHouse Cloud. It replaces `ReplicatedMergeTree` by storing data in shared object storage (S3 or GCS) rather than local disk, enabling any compute node to read from any data part without copying data between replicas.

## How SharedMergeTree Differs from ReplicatedMergeTree

In self-hosted ClickHouse, `ReplicatedMergeTree` copies data parts between replicas using ZooKeeper or ClickHouse Keeper for coordination. Each replica stores its own full copy of the data.

`SharedMergeTree` stores data parts in shared object storage. All replicas access the same data directly, eliminating inter-node data transfer for replication. Only metadata is coordinated between nodes.

```yaml
ReplicatedMergeTree:
  Node 1 [local disk: part_1, part_2] <-- ZooKeeper --> Node 2 [local disk: part_1, part_2]

SharedMergeTree:
  Node 1 [cache] ─┐
  Node 2 [cache] ─┼── Shared Object Storage [part_1, part_2, part_3...]
  Node 3 [cache] ─┘
```

## Creating a Table in ClickHouse Cloud

In ClickHouse Cloud, `MergeTree` tables automatically use `SharedMergeTree`:

```sql
-- This creates a SharedMergeTree table in ClickHouse Cloud
CREATE TABLE events (
    event_time DateTime64(3),
    service LowCardinality(String),
    user_id UInt32,
    event_type LowCardinality(String),
    properties String
) ENGINE = MergeTree()
ORDER BY (service, event_time)
PARTITION BY toYYYYMM(event_time);
```

You do not need to specify replica paths or shard macros - ClickHouse Cloud handles this automatically.

## Verifying the Engine

```sql
SELECT name, engine
FROM system.tables
WHERE name = 'events';
-- Returns: SharedMergeTree
```

## Horizontal Scaling Benefits

Because data lives in shared storage, ClickHouse Cloud can add compute nodes instantly without rebalancing data:

```sql
-- Check how many compute nodes are serving your service
SELECT * FROM clusterAllReplicas('default', system.one);
```

New nodes immediately have access to all existing data through the shared object storage layer, enabling instant horizontal scaling.

## Lightweight Node Scaling

SharedMergeTree uses asynchronous leaderless replication with shared storage: when a new node joins, it does not transfer any data parts. It only syncs metadata about which parts exist through ClickHouse Keeper. This makes scaling from 2 to 10 nodes nearly instantaneous.

## Performance Considerations

- Local SSD cache is maintained on each node to avoid S3 latency on hot data.
- Cache size is configurable based on your query patterns.
- Cold queries (cache misses) have higher latency than self-hosted deployments on local NVMe.
- For read-heavy dashboards, warm cache hits are comparable to local disk performance.

## Summary

SharedMergeTree in ClickHouse Cloud stores all data in shared object storage with per-node local caching, enabling instant horizontal scaling and zero-copy replication. It simplifies operations by removing the need to manage replication topology, data transfer, and shard placement that self-hosted `ReplicatedMergeTree` requires.
