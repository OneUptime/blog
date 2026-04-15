# How to Plan Shard Count for ClickHouse Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Sharding, Capacity Planning, Distributed, Infrastructure

Description: Determine the optimal number of ClickHouse shards based on ingestion throughput, storage per node, and the overhead of distributed query coordination.

---

Sharding distributes both data and write load across multiple nodes. Too few shards creates hotspots; too many increases distributed query overhead. The right count balances both concerns.

## When to Add Shards

Add shards when:
- A single shard's storage exceeds 70% of available disk.
- Ingestion throughput saturates a single node's CPU or disk write bandwidth.
- Query fan-out to replicas is insufficient for your read QPS.

## Storage-Based Shard Count

```text
Total compressed data: 20 TB
Per-node usable storage: 4 TB
Replication factor: 2
Logical capacity per shard: 4 TB (each replica stores the same data)
Shards needed: ceil(20 / 4) = 5 shards
Total nodes: 5 shards × 2 replicas = 10 nodes
```

Allow for growth: add 2 more shards proactively = 7 shards.

## Ingestion-Based Shard Count

```text
Total ingestion rate: 500,000 rows/sec
Max insert rate per shard node: 150,000 rows/sec (from benchmark)
Shards needed: ceil(500,000 / 150,000) = 4 shards
```

## Distributed Query Overhead

Every distributed query sends a sub-query to each shard and merges results. Merging cost grows with shard count. Measure it:

```sql
-- Run on distributed table and compare to local table
SELECT count(), uniq(user_id) FROM dist_events WHERE ts >= today();
-- Compare with
SELECT count(), uniq(user_id) FROM local_events WHERE ts >= today();
```

A 2-3x slowdown on the distributed query is normal. More than 5x signals too many shards or an inefficient shard key.

## Choosing a Shard Key

```sql
CREATE TABLE events ON CLUSTER 'prod'
(
    user_id UInt64,
    data    String,
    ts      DateTime
)
ENGINE = ReplicatedMergeTree(...)
PARTITION BY toYYYYMM(ts)
ORDER BY (user_id, ts);

-- Distributed table using user_id for sharding
CREATE TABLE dist_events ON CLUSTER 'prod'
AS events
ENGINE = Distributed('prod', default, events, cityHash64(user_id));
```

## Recommended Starting Points

```text
Data volume   | Ingestion rate      | Shards
< 1 TB        | < 50K rows/sec      | 1-2
1-10 TB       | 50K-200K rows/sec   | 2-4
10-100 TB     | 200K-1M rows/sec    | 4-8
> 100 TB      | > 1M rows/sec       | 8+
```

## Summary

Plan shard count from the larger of your storage-driven and ingestion-driven estimates. Start with fewer shards and add more as you grow - adding shards is easier than removing them. Always measure distributed query overhead after resharding.
