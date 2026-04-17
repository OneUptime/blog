# How to Configure max_parallel_replicas in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, max_parallel_replicas, Distributed, Parallel, Performance, Replica

Description: Use max_parallel_replicas to parallelize reads across multiple replicas of a single shard and speed up large analytical queries.

---

ClickHouse normally reads from one replica per shard. The `max_parallel_replicas` setting allows a single query to read different parts of the same shard from multiple replicas simultaneously, giving you more CPU and I/O bandwidth without adding shards.

## What max_parallel_replicas Does

When set to a value greater than 1, ClickHouse divides the part list of a shard among N replicas. Each replica reads a disjoint subset of parts and streams results back to the initiator. The initiator merges the partial results.

```sql
SET max_parallel_replicas = 3;

SELECT count(), sum(value)
FROM dist_events
WHERE event_date >= today() - 7;
```

With 3 replicas available per shard, ClickHouse distributes the scan across all three, tripling read throughput for that shard.

## Requirements

- The table must use a replicated engine (`ReplicatedMergeTree` family).
- All replicas must be healthy and reachable.
- A `parallel_replicas_custom_key` or sampling key is required in newer ClickHouse versions to deterministically split work.

## Setting a Custom Parallel Key

In ClickHouse 23.3+, you can define an explicit key for work division:

```sql
SET max_parallel_replicas = 3;
SET parallel_replicas_custom_key = 'cityHash64(user_id)';
SET parallel_replicas_custom_key_filter_type = 'range';
```

This tells ClickHouse to split rows by hash range of `user_id` across replicas, ensuring each row is read exactly once.

## Checking Parallel Replica Usage

```sql
SELECT
    query_id,
    ProfileEvents['ParallelReplicasHandleRequestMicroseconds'] AS handle_us,
    ProfileEvents['ParallelReplicasReadAssignedMarks']         AS assigned_marks,
    ProfileEvents['ParallelReplicasReadUnassignedMarks']       AS unassigned_marks
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY query_start_time DESC
LIMIT 5;
```

Non-zero `assigned_marks` confirms that parallel replica reads are active.

## When to Use It

- Large full-scan queries on a cluster with few shards but many replicas.
- Read-heavy analytics where adding shards is not feasible.
- Reporting queries that need low latency on a small cluster.

## Caveats

Setting `max_parallel_replicas` too high on short queries adds coordination overhead that outweighs the parallelism benefit. Start with 2 and benchmark before increasing further.

## Summary

`max_parallel_replicas` unlocks horizontal read scaling within a single shard by splitting part reads across replicas. Configure a custom parallel key for deterministic splitting, monitor progress via `system.query_log` ProfileEvents, and benchmark before committing to a value higher than 2 or 3.
