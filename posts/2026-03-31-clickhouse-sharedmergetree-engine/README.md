# How to Use SharedMergeTree Engine in ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SharedMergeTree, ClickHouse Cloud, Replication, Object Storage

Description: Learn how SharedMergeTree works in ClickHouse Cloud, replacing ReplicatedMergeTree with a cloud-native engine backed by shared object storage.

---

SharedMergeTree is a ClickHouse Cloud-specific table engine that replaces the traditional ReplicatedMergeTree for cloud deployments. Instead of replicating data between nodes by copying parts, SharedMergeTree stores all data in shared object storage (Amazon S3 or GCS) and coordinates metadata through ClickHouse Keeper. This architecture reduces storage costs and simplifies replication.

## How It Differs from ReplicatedMergeTree

With ReplicatedMergeTree:
- Each replica stores a full copy of the data
- Data is synced between nodes over the network
- Storage scales linearly with replica count

With SharedMergeTree:
- Data lives once in shared object storage
- All nodes access the same data files
- Compute and storage scale independently

## Creating a SharedMergeTree Table

In ClickHouse Cloud, tables are automatically created with SharedMergeTree. You use the same syntax as MergeTree:

```sql
CREATE TABLE events (
    event_id UInt64,
    event_type String,
    ts DateTime,
    user_id UInt32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, ts);
```

ClickHouse Cloud internally maps this to SharedMergeTree. You can verify:

```sql
SELECT engine
FROM system.tables
WHERE name = 'events';
-- Returns: SharedMergeTree
```

## Querying Across Nodes

Since all compute nodes read from the same shared storage, queries are automatically distributed:

```sql
SELECT
    event_type,
    count() AS cnt,
    uniq(user_id) AS unique_users
FROM events
WHERE ts >= now() - INTERVAL 7 DAY
GROUP BY event_type
ORDER BY cnt DESC;
```

## Scaling Compute Without Data Migration

One key advantage is that you can add or remove compute nodes without moving data:

```bash
# In ClickHouse Cloud console: scale from 3 to 6 nodes
# No data migration needed - all nodes read from same S3 bucket
```

## Mutations and Lightweight Deletes

SharedMergeTree supports lightweight deletes, available since ClickHouse 22.8 and generally available since 23.3:

```sql
-- Mark rows for deletion
DELETE FROM events WHERE user_id = 42;

-- Check mutation status
SELECT *
FROM system.mutations
WHERE table = 'events'
  AND is_done = 0;
```

## Comparing Variants

ClickHouse Cloud creates engine variants based on your CREATE TABLE engine choice:

```text
MergeTree                      -> SharedMergeTree
ReplacingMergeTree             -> SharedReplacingMergeTree
SummingMergeTree               -> SharedSummingMergeTree
AggregatingMergeTree           -> SharedAggregatingMergeTree
CollapsingMergeTree            -> SharedCollapsingMergeTree
VersionedCollapsingMergeTree   -> SharedVersionedCollapsingMergeTree
GraphiteMergeTree              -> SharedGraphiteMergeTree
```

You can use the specialized engines as you would on self-hosted, but the underlying storage and coordination are handled via SharedMergeTree infrastructure.

## Limitations

- SharedMergeTree is only available in ClickHouse Cloud; self-hosted deployments use ReplicatedMergeTree.
- Some advanced ZooKeeper path configurations are abstracted away.
- Cold data retrieval may have slightly higher latency than local disk in on-premises clusters.

## Summary

SharedMergeTree is ClickHouse Cloud's answer to efficient, scalable replication. By sharing a single copy of data in object storage across all compute nodes, it eliminates redundant data copies, reduces costs, and enables elastic scaling. When building on ClickHouse Cloud, you get SharedMergeTree automatically - focus on query design and leave storage coordination to the platform.
