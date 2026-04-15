# How to Optimize Network Transfer in Distributed ClickHouse Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Network, Compression, Performance, Bandwidth

Description: Reduce the bytes transferred between ClickHouse shards and the initiator using compression, column pruning, and early filtering strategies.

---

In a distributed ClickHouse cluster, network transfer is often the dominant cost. Shards compress data before sending it, but query design choices have a far larger impact than codec selection alone.

## Enable Compression for Distributed Queries

ClickHouse compresses inter-shard traffic by default, but verify that the setting is active:

```sql
SELECT name, value
FROM system.settings
WHERE name = 'network_compression_method';
```

You can also set it per query:

```sql
SET network_compression_method = 'lz4';
-- or 'zstd' for better ratio at slightly higher CPU cost
```

ZSTD is worth the CPU trade-off when network bandwidth is the bottleneck.

## Select Only the Columns You Need

Column-oriented storage means unused columns are never read from disk, but they still occupy slots in the network stream if you SELECT *. Always project explicitly.

```sql
-- Bad
SELECT * FROM dist_events WHERE event_date = today();

-- Good
SELECT user_id, event_type, created_at
FROM dist_events
WHERE event_date = today();
```

## Push Filters as Deep as Possible

ClickHouse rewrites WHERE clauses so shards filter before transmitting. Make sure your predicates use the primary key or partition key so shards can skip parts.

```sql
-- The partition pruning happens on each shard, minimizing rows sent
SELECT user_id, sum(value)
FROM dist_events
WHERE toYYYYMM(event_time) = 202501
  AND event_type = 'purchase'
GROUP BY user_id;
```

## Leverage PREWHERE Optimization

PREWHERE reads only the filter column first, skipping rows before loading the rest. It is supported on MergeTree family tables, not on Distributed tables directly. However, ClickHouse automatically moves eligible WHERE conditions to PREWHERE on each shard's local MergeTree table when `optimize_move_to_prewhere` is enabled (the default):

```sql
SELECT user_id, value
FROM dist_events
WHERE event_type = 'purchase'
  AND event_date = today();
```

ClickHouse pushes this query to each shard, where the local MergeTree table automatically applies PREWHERE optimization. This reduces bytes read per shard, which directly reduces bytes sent over the network.

## Monitor Network Metrics

```sql
SELECT
    query_id,
    formatReadableSize(ProfileEvents['NetworkSendBytes'])    AS sent,
    formatReadableSize(ProfileEvents['NetworkReceiveBytes']) AS received,
    result_rows
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY ProfileEvents['NetworkReceiveBytes'] DESC
LIMIT 10;
```

If `received` is orders of magnitude larger than `result_rows * avg_row_size`, filters are not being pushed down efficiently.

## Sampling for Exploratory Queries

For approximate analytics, SAMPLE limits the rows each shard returns:

```sql
SELECT user_id, count() * 10 AS approx_events
FROM dist_events SAMPLE 0.1
GROUP BY user_id
ORDER BY approx_events DESC
LIMIT 20;
```

## Summary

Reducing network transfer in distributed ClickHouse queries requires explicit column selection, aggressive WHERE/PREWHERE filtering, and enabling ZSTD compression for inter-shard traffic. Use `system.query_log` ProfileEvents to measure actual bytes transferred and identify queries that send more data than necessary.
