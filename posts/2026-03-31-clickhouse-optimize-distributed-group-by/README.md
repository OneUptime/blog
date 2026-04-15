# How to Optimize Distributed GROUP BY in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, GROUP BY, Aggregation, Performance, Shard

Description: Practical techniques for speeding up GROUP BY queries on Distributed tables by reducing data shuffled to the initiator node.

---

GROUP BY on a Distributed table forces partial aggregates from every shard to be sent to the initiator, which then performs the final merge. When groups are large or cardinality is high, this merge step becomes the bottleneck. Several ClickHouse features directly address this.

## Push Down the Aggregation to Shards

If the GROUP BY key matches your sharding key, ClickHouse can fully aggregate on each shard and send only summary rows to the initiator.

```sql
-- Distributed table sharded by user_id
SELECT user_id, sum(revenue)
FROM dist_orders
GROUP BY user_id;
```

When `user_id` is the sharding key, each shard owns all rows for a given `user_id`, so the shard result is already final. The initiator only concatenates rows.

## Use distributed_group_by_no_merge

When you know the aggregation is already complete on shards, instruct the initiator not to re-merge. This setting accepts three values:

- `0` (default): Normal behavior — the initiator merges partial aggregation states from all shards.
- `1`: The initiator does not merge aggregation states and simply proxies shard results. Note that `ORDER BY` and `LIMIT` are also not applied on the initiator.
- `2`: Same as `1`, but the initiator still applies `ORDER BY` and `LIMIT`. This is usually the more practical choice.

```sql
SET distributed_group_by_no_merge = 2;

SELECT user_id, sum(revenue)
FROM dist_orders
GROUP BY user_id
ORDER BY total DESC
LIMIT 100;
```

Use this only when sharding guarantees complete groups per shard, otherwise results will be incorrect.

## Two-Level Aggregation

Two-level aggregation is enabled by default (threshold of 100,000 keys or 50 MB of aggregation state). You can lower the thresholds to trigger it sooner for queries that benefit from reduced peak memory during the merge phase:

```sql
SET group_by_two_level_threshold = 50000;       -- default: 100000
SET group_by_two_level_threshold_bytes = 20000000; -- default: 50000000
```

With two-level aggregation, shards partition their hash table into 256 buckets. The initiator merges one bucket at a time, keeping peak memory bounded.

## Limit Data Transferred with HAVING

Use a `HAVING` clause directly in the query so shards discard low-volume groups early:

```sql
SELECT user_id, sum(revenue) AS total
FROM dist_orders
GROUP BY user_id
HAVING total > 1000;
```

With `HAVING`, each shard filters out groups that do not meet the threshold before sending results to the initiator, reducing network traffic. Avoid wrapping the aggregation in a subquery with an outer `WHERE` for this purpose — predicate push-down through subqueries on Distributed tables is unreliable and may prevent aggregation from being pushed to shards.

## Monitor Aggregation Memory

```sql
SELECT
    query_id,
    formatReadableSize(memory_usage) AS mem,
    ProfileEvents['AggregationPreallocatedElementsInHashTables'] AS prealloced
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%dist_orders%'
ORDER BY memory_usage DESC
LIMIT 5;
```

## Summary

Optimize distributed GROUP BY by aligning the GROUP BY key with the sharding key, tuning two-level aggregation thresholds, and using `HAVING` to filter groups on shards before they are sent to the initiator. When sharding guarantees group completeness, `distributed_group_by_no_merge = 2` eliminates the initiator merge while still applying `ORDER BY` and `LIMIT`.
