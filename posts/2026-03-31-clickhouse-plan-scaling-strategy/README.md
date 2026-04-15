# How to Plan ClickHouse Scaling Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Scaling, Capacity Planning, Sharding, Infrastructure

Description: Choose the right ClickHouse scaling strategy - vertical scaling, adding replicas, or adding shards - based on your bottleneck type and growth trajectory.

---

ClickHouse supports two scaling axes: vertical (bigger nodes) and horizontal (more shards). The right choice depends on whether your bottleneck is CPU, memory, storage, or query concurrency.

## Identify Your Bottleneck

```sql
-- CPU bound? Check query CPU time
SELECT avg(query_duration_ms), avg(ProfileEvents.Values[indexOf(ProfileEvents.Names, 'UserTimeMicroseconds')])
FROM system.query_log
WHERE type = 'QueryFinish' AND query_start_time > now() - INTERVAL 1 HOUR;

-- Memory bound? Check peak memory
SELECT max(memory_usage) / 1e9 AS peak_gb
FROM system.query_log
WHERE type = 'QueryFinish' AND query_start_time > now() - INTERVAL 1 HOUR;

-- Storage bound?
SELECT formatReadableSize(sum(bytes_on_disk)) FROM system.parts WHERE active;
```

## Scaling Decision Tree

```text
Bottleneck: CPU
  -> More cores: scale vertically first, then add replicas for read parallelism

Bottleneck: Memory
  -> Bigger RAM: scale vertically

Bottleneck: Storage
  -> Add disks on existing nodes or add new shards

Bottleneck: Query concurrency
  -> Add replicas (each replica handles a separate query stream)

Bottleneck: Ingestion throughput
  -> Add shards (distributes write load)
```

## Vertical Scaling (Bigger Nodes)

Fastest option - resize nodes during a maintenance window. ClickHouse resumes with more resources automatically. No data migration needed for single-node setups.

## Adding Replicas

Add a new replica to an existing shard:

```sql
-- On new replica node, create the table with same replication path
CREATE TABLE events
ENGINE = ReplicatedMergeTree('/clickhouse/tables/shard1/events', 'replica3')
...;
```

The new replica fetches parts from existing replicas automatically.

## Adding Shards (Resharding)

Resharding requires moving data. Steps:
1. Add new shard to the cluster configuration.
2. Create the distributed table referencing the new cluster.
3. Migrate data using `INSERT INTO new_table SELECT * FROM old_distributed_table`.
4. Update applications to use the new cluster name.

## Monitoring Scaling Progress

Track query latency before and after scaling events in [OneUptime](https://oneuptime.com). Compare p50 and p99 latency on the same query across a 7-day window to confirm the scaling had the expected effect.

## Summary

Match your scaling strategy to your bottleneck: vertical for CPU/memory, replicas for concurrency and read throughput, shards for write throughput and storage. Always measure the bottleneck before scaling to avoid wasting resources.
