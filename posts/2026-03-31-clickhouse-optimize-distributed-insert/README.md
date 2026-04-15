# How to Optimize Distributed INSERT INTO in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Insert, Ingestion, Performance, Sharding

Description: Maximize INSERT throughput on Distributed tables by tuning buffer size, async inserts, and direct shard writes in ClickHouse.

---

Inserting into a Distributed table in ClickHouse has extra overhead compared to inserting directly into a local MergeTree. The Distributed engine must parse each row, determine which shard it belongs to, buffer the data, and asynchronously forward it to the target shard. Tuning these steps dramatically improves ingestion throughput.

## How Distributed INSERT Works

1. Your client sends rows to the initiator node via the Distributed table.
2. The initiator applies the sharding expression (e.g., `cityHash64(user_id) % num_shards`).
3. Rows are written to a temporary directory on the initiator disk.
4. A background thread forwards the buffered data to each shard.
5. The shard writes to its local ReplicatedMergeTree.

Step 4 is asynchronous by default, so the INSERT returns before data reaches the shard.

## insert_distributed_sync

Set to 1 to wait until data is flushed to all shards before acknowledging the INSERT:

```sql
SET insert_distributed_sync = 1;
```

This guarantees durability at the cost of higher write latency. Use it for low-volume, high-importance writes.

## Batching Inserts

Sending many small INSERTs creates many tiny parts on shards. Batch rows into larger blocks:

```sql
-- Bad: thousands of single-row inserts
INSERT INTO dist_events VALUES (now(), 1, 'click');

-- Good: bulk insert in one statement
INSERT INTO dist_events
SELECT * FROM input('event_time DateTime, user_id UInt64, event_type String')
FORMAT CSV;
```

Aim for blocks of at least 100,000 rows per INSERT.

## Async Inserts for High-Frequency Small Writes

If batching at the client is not possible, use async inserts:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 0;
SET async_insert_max_data_size = 10485760; -- 10 MB
SET async_insert_busy_timeout_ms = 1000;
```

ClickHouse accumulates small inserts server-side and flushes them as one batch.

## Write Directly to Local Tables

The most efficient pattern avoids the Distributed engine for writes entirely. Use a load balancer (or Kafka) to route inserts directly to each shard's local table:

```sql
-- On shard1
INSERT INTO events_local VALUES (...);
-- On shard2
INSERT INTO events_local VALUES (...);
```

This eliminates the buffering and forwarding overhead of the Distributed engine.

## Monitor the Distributed Buffer

```sql
SELECT
    metric,
    value,
    description
FROM system.metrics
WHERE metric LIKE 'DistributedFilesTo%';
```

A growing `DistributedFilesToInsert` count means the background sender is falling behind.

## Summary

Optimize distributed INSERTs in ClickHouse by batching rows into large blocks, using async inserts for high-frequency small writes, and where possible writing directly to shard-local tables. Monitor `DistributedFilesToInsert` to detect when the background forwarder is a bottleneck.
