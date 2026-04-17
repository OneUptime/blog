# How to Understand ClickHouse Distributed Query Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Query Execution, Shard, Performance, MergeTree

Description: Understand how ClickHouse plans and executes queries across shards, from query fan-out to result merging on the initiator node.

---

When you query a Distributed table in ClickHouse, the node receiving the query acts as an initiator. It rewrites the query, fans it out to every shard, waits for partial results, and merges them locally. Understanding this pipeline is the first step toward building fast multi-shard deployments.

## The Execution Stages

1. **Parse and plan** - the initiator parses your SQL and produces a query plan.
2. **Rewrite for shards** - the initiator strips the outer aggregation and sends a sub-query to each shard.
3. **Shard execution** - each shard runs the sub-query against its local MergeTree replica.
4. **Result transfer** - shards stream partial results back to the initiator over TCP.
5. **Merge** - the initiator performs the final aggregation, sorting, and LIMIT.

## Viewing the Distributed Plan

Use `EXPLAIN` to inspect how ClickHouse handles distribution:

```sql
EXPLAIN SELECT user_id, count()
FROM cluster_events
GROUP BY user_id
LIMIT 10;
```

Look for `ReadFromRemote` and `Distributed` nodes in the output. These indicate data fetched from remote shards.

## Two-Level Aggregation

For large GROUP BY queries ClickHouse can switch to two-level aggregation, where each shard hashes rows into buckets and the initiator merges bucket by bucket rather than row by row.

```sql
SET group_by_two_level_threshold = 100000;
SET group_by_two_level_threshold_bytes = 50000000;
```

Check whether two-level aggregation fired:

```sql
SELECT
    query_id,
    ProfileEvents['AggregationHashTablesInitializedAsTwoLevel'] AS two_level
FROM system.query_log
WHERE query_id = 'your-query-id';
```

## Controlling Shard Selection

The `load_balancing` setting controls which shard replica the initiator prefers:

```sql
SET load_balancing = 'nearest_hostname';
-- options: random, nearest_hostname, in_order, first_or_random
```

`nearest_hostname` routes to the replica whose hostname differs from the initiator's by the fewest characters at matching positions, reducing cross-datacenter traffic.

## Monitoring Remote Query Overhead

```sql
SELECT
    query_id,
    ProfileEvents['NetworkSendBytes']     AS sent_bytes,
    ProfileEvents['NetworkReceiveBytes']  AS recv_bytes,
    ProfileEvents['RemoteReadThrottlerSleepMicroseconds'] AS throttle_us
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY recv_bytes DESC
LIMIT 5;
```

High `recv_bytes` relative to result set size suggests unnecessary data is being transferred from shards - a hint to push down more filtering or use projections.

## Summary

ClickHouse distributed query execution fans out sub-queries to shards, collects partial results, and merges them on the initiator. Tuning two-level aggregation thresholds, choosing the right load-balancing strategy, and monitoring network metrics via `system.query_log` are the core levers for improving distributed query performance.
