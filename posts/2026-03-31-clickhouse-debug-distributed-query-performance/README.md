# How to Debug Distributed Query Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Performance, Debugging, Query Log, Profiling

Description: Step-by-step guide to diagnosing slow distributed queries in ClickHouse using EXPLAIN, query logs, and system tables.

---

Distributed query performance problems in ClickHouse typically fall into a few categories: excessive data transfer, uneven shard load, slow replica selection, or inefficient aggregation. This guide walks through a systematic debugging approach.

## Start with EXPLAIN

Always begin with EXPLAIN to understand the logical plan:

```sql
EXPLAIN PLAN
SELECT user_id, count()
FROM dist_events
WHERE event_date = today()
GROUP BY user_id;
```

Look for:
- `ReadFromRemote` nodes (data crossing the network)
- Missing partition pruning (reading too many parts)
- Multiple aggregation steps (inefficient merging)

## Check system.query_log on the Initiator

```sql
SELECT
    query_id,
    query_duration_ms,
    read_rows,
    result_rows,
    formatReadableSize(memory_usage)                          AS mem,
    formatReadableSize(ProfileEvents['NetworkReceiveBytes'])  AS net_recv
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%dist_events%'
ORDER BY query_duration_ms DESC
LIMIT 5;
```

## Inspect Per-Shard Execution Times

Distributed queries log sub-queries on each shard. Compare their durations:

```sql
SELECT
    hostname(),
    query_id,
    query_duration_ms,
    read_rows
FROM clusterAllReplicas('my_cluster', system.query_log)
WHERE initial_query_id = 'your-initiator-query-id'
  AND type = 'QueryFinish';
```

A shard with much higher `query_duration_ms` is the tail. Investigate its part count and index usage.

## Identify Missing Index Usage

On the slow shard:

```sql
SELECT
    table,
    name,
    rows,
    bytes_on_disk,
    primary_key_bytes_in_memory
FROM system.parts
WHERE table = 'events' AND active
ORDER BY bytes_on_disk DESC
LIMIT 10;
```

## Check for Data Skew

Data skew means one shard holds far more rows than others, slowing the whole query:

```sql
SELECT
    hostName()  AS host,
    count()     AS row_count
FROM clusterAllReplicas('my_cluster', default.events)
GROUP BY host
ORDER BY row_count DESC;
```

Large variance in `row_count` indicates a poor sharding key choice.

## Profile Network Costs

```sql
SELECT
    query_id,
    ProfileEvents['NetworkSendBytes']    / 1e6 AS send_mb,
    ProfileEvents['NetworkReceiveBytes'] / 1e6 AS recv_mb
FROM system.query_log
WHERE initial_query_id = 'your-query-id'
  AND type = 'QueryFinish';
```

## Summary

Debug distributed ClickHouse queries by starting with EXPLAIN, then cross-referencing `system.query_log` across all shards using `clusterAllReplicas`. Identify tail shards, check for data skew in part counts, and measure network bytes to determine whether the bottleneck is computation or data transfer.
