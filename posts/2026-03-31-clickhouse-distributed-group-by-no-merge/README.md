# How to Use distributed_group_by_no_merge Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Query, GROUP BY, Performance, Setting

Description: Learn how the distributed_group_by_no_merge setting changes GROUP BY behavior on distributed tables and when to enable it for better performance.

---

The `distributed_group_by_no_merge` setting in ClickHouse controls whether aggregation results from distributed query shards are merged at the initiator node. By default, ClickHouse merges partial aggregation states from each shard before returning results. Disabling this merge step can improve performance in certain scenarios.

## What distributed_group_by_no_merge Does

When you run a `GROUP BY` query against a `Distributed` table, ClickHouse sends the query to each shard and then merges the partial aggregation results. Setting `distributed_group_by_no_merge = 1` tells the initiator node to skip the final merge and return raw partial results from each shard directly.

```sql
SET distributed_group_by_no_merge = 1;

SELECT
    status_code,
    count() AS request_count
FROM distributed_logs
GROUP BY status_code;
```

This returns separate result sets from each shard without merging them together.

## When to Use This Setting

This setting is useful when:
- Data is already pre-sharded by the GROUP BY key, so each shard holds all rows for a given key
- You want to inspect per-shard results for debugging purposes
- You are building a pipeline that handles merging externally

```sql
-- Check if data is sharded by user_id for accurate no-merge results
SELECT
    user_id,
    sum(events) AS total_events
FROM distributed_events
GROUP BY user_id
SETTINGS distributed_group_by_no_merge = 1;
```

If user data is sharded by `user_id`, each shard holds all events for a given user and the result is accurate without merging.

## Available Values

The setting accepts three values:

```text
0 - Default: final query processing is done on the initiator node
1 - Do not merge: query is completely processed on the shard, initiator only proxies the data
2 - Same as 1, but ORDER BY and LIMIT are applied on the initiator
```

```sql
-- Use value 2 when the query has ORDER BY and/or LIMIT that must be applied globally
SELECT status, count() AS cnt
FROM distributed_requests
GROUP BY status
ORDER BY cnt DESC
LIMIT 10
SETTINGS distributed_group_by_no_merge = 2;
```

## Performance Implications

Disabling the merge step reduces network overhead and CPU usage on the initiator node. For large aggregations where the initiator would otherwise need to merge millions of rows, this can significantly reduce latency.

```sql
-- Compare query times
SET distributed_group_by_no_merge = 0;
SELECT region, sum(revenue) FROM distributed_sales GROUP BY region;

SET distributed_group_by_no_merge = 1;
SELECT region, sum(revenue) FROM distributed_sales GROUP BY region;
```

Monitor the difference using `system.query_log`:

```sql
SELECT
    query_duration_ms,
    read_rows,
    memory_usage
FROM system.query_log
WHERE query LIKE '%distributed_sales%'
ORDER BY event_time DESC
LIMIT 5;
```

## Caveats

Using `distributed_group_by_no_merge = 1` when data is not sharded by the GROUP BY key produces incorrect results because partial aggregates from different shards are not combined. Always verify your sharding key matches your GROUP BY key before enabling this setting in production.

## Summary

The `distributed_group_by_no_merge` setting gives you control over how ClickHouse handles aggregation across distributed table shards. Enable it when your sharding key matches your GROUP BY key to reduce initiator-side CPU and network overhead. Use value `2` when the query has `ORDER BY` or `LIMIT` that must be applied globally on the initiator.
