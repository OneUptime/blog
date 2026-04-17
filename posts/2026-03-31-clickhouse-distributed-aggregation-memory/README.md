# How to Configure distributed_aggregation_memory_efficient in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Distributed, Performance, Memory, Configuration

Description: Learn how to enable distributed_aggregation_memory_efficient in ClickHouse to reduce memory usage during two-phase distributed GROUP BY aggregation across cluster nodes.

---

In a ClickHouse cluster, a `GROUP BY` query on a Distributed table executes in two phases: each shard computes a partial aggregation locally, then the coordinator node merges all partial results. By default, the coordinator holds all partial results from every shard in memory simultaneously before merging. The `distributed_aggregation_memory_efficient` setting changes this behavior to use a streaming merge that dramatically reduces coordinator memory usage.

## How Two-Phase Aggregation Works

When you run a `GROUP BY` on a Distributed table:

1. **Phase 1 (local)**: Each shard node runs the aggregation on its local data and produces a set of partial aggregate states keyed by the group key.
2. **Phase 2 (merge)**: The coordinator receives partial states from all shards and merges them into a final result.

Without `distributed_aggregation_memory_efficient`, the coordinator loads all partial states from all shards into RAM at once and then merges. On a 20-shard cluster where each shard produces 2 GiB of partial state, the coordinator needs 40 GiB just for the merge step.

With `distributed_aggregation_memory_efficient = 1`, the coordinator uses a streaming merge: it processes one bucket of group keys at a time across all shards, keeping only a fraction of the data in memory at any moment.

## Enabling the Setting

```sql
-- Enable for a single query
SELECT
    user_country,
    device_type,
    count() AS sessions,
    uniqExact(user_id) AS unique_users,
    sum(revenue) AS total_revenue
FROM distributed_sessions
GROUP BY user_country, device_type
SETTINGS distributed_aggregation_memory_efficient = 1;
```

Set the default in a user profile:

```xml
<clickhouse>
    <profiles>
        <default>
            <distributed_aggregation_memory_efficient>1</distributed_aggregation_memory_efficient>
        </default>
    </profiles>
</clickhouse>
```

## How the Streaming Merge Works

When `distributed_aggregation_memory_efficient = 1` is active, ClickHouse uses a hash-based bucket approach:

1. Each shard splits its partial aggregation state into 256 buckets based on the hash of the group key (the bucket count is fixed in ClickHouse's two-level hash table implementation).
2. The coordinator requests one bucket at a time from all shards.
3. For bucket `i`, the coordinator loads partial states only for group keys that hash to bucket `i`, merges them, emits the result, and discards the memory before loading bucket `i+1`.

This means the coordinator's peak memory usage for the merge phase is approximately: `(total_partial_state_size / 256) * merge_threads`

The number of buckets merged in parallel is controlled by `aggregation_memory_efficient_merge_threads`:

```sql
SELECT count(), sum(revenue)
FROM distributed_events
GROUP BY user_id
SETTINGS
    distributed_aggregation_memory_efficient = 1,
    aggregation_memory_efficient_merge_threads = 4;
```

More merge threads allow more buckets to be processed in parallel, trading some memory back for speed.

## Example: Measuring Memory Reduction

Without the setting:

```sql
-- Baseline: full merge in coordinator RAM
SELECT
    event_type,
    count() AS cnt,
    uniq(user_id) AS unique_users
FROM distributed_events
WHERE event_date >= today() - 30
GROUP BY event_type
SETTINGS
    distributed_aggregation_memory_efficient = 0,
    log_comment = 'no_mem_efficient';
```

With the setting:

```sql
-- Memory-efficient merge
SELECT
    event_type,
    count() AS cnt,
    uniq(user_id) AS unique_users
FROM distributed_events
WHERE event_date >= today() - 30
GROUP BY event_type
SETTINGS
    distributed_aggregation_memory_efficient = 1,
    log_comment = 'with_mem_efficient';
```

Compare results:

```sql
SELECT
    log_comment,
    query_duration_ms,
    formatReadableSize(memory_usage) AS peak_memory,
    read_rows
FROM system.query_log
WHERE log_comment IN ('no_mem_efficient', 'with_mem_efficient')
  AND type = 'QueryFinish'
ORDER BY event_time DESC;
```

## Interaction with group_by_two_level_threshold

ClickHouse switches to two-level aggregation (which enables the bucketed merge) when the number of unique groups exceeds `group_by_two_level_threshold`:

```sql
SELECT
    user_segment,
    event_type,
    count() AS events
FROM distributed_events
GROUP BY user_segment, event_type
SETTINGS
    distributed_aggregation_memory_efficient = 1,
    -- Switch to two-level aggregation when more than 100,000 unique groups exist
    group_by_two_level_threshold = 100000,
    group_by_two_level_threshold_bytes = 104857600;  -- Or when state exceeds 100 MiB
```

If the result has fewer unique groups than `group_by_two_level_threshold`, single-level aggregation is used and `distributed_aggregation_memory_efficient` has no effect (because there is only one bucket).

## When to Enable This Setting

Enable `distributed_aggregation_memory_efficient` when:

- You run GROUP BY queries on Distributed tables with high-cardinality group keys.
- Your coordinator node has limited RAM relative to the number of shards.
- You observe OOM errors during the final merge phase of distributed queries.
- Queries run on many shards (5+) producing large partial aggregation states.

The trade-off is slightly higher coordinator CPU usage and somewhat longer wall-clock time because the merge is done sequentially by bucket. For most analytical workloads the memory savings are worth this cost.

## Combining with Local Aggregation Spill

For maximum memory efficiency, also enable disk spill for the local aggregation phase on each shard:

```sql
SELECT
    user_id,
    count() AS events,
    sum(revenue) AS revenue
FROM distributed_events
WHERE event_date >= today() - 90
GROUP BY user_id
SETTINGS
    distributed_aggregation_memory_efficient = 1,
    max_bytes_before_external_group_by = 8589934592,  -- Spill local agg to disk at 8 GiB
    max_memory_usage = 16106127360;                   -- 15 GiB per-query limit
```

This two-layer approach ensures both the per-shard aggregation and the coordinator merge step stay within RAM bounds.

## Checking Whether the Setting Is Being Used

```sql
-- Verify the setting is active for the current session
SELECT value
FROM system.settings
WHERE name = 'distributed_aggregation_memory_efficient';
```

```sql
-- Confirm it was set for recent queries
SELECT
    query_id,
    Settings['distributed_aggregation_memory_efficient'] AS mem_efficient,
    formatReadableSize(memory_usage) AS peak_memory,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 10;
```

## Recommended Profile Configuration for Distributed Clusters

```xml
<clickhouse>
    <profiles>
        <default>
            <!-- Enable memory-efficient distributed aggregation by default -->
            <distributed_aggregation_memory_efficient>1</distributed_aggregation_memory_efficient>

            <!-- Use two-level aggregation for more than 100k unique keys -->
            <group_by_two_level_threshold>100000</group_by_two_level_threshold>
            <group_by_two_level_threshold_bytes>104857600</group_by_two_level_threshold_bytes>

            <!-- Spill local aggregation to disk if it exceeds 8 GiB -->
            <max_bytes_before_external_group_by>8589934592</max_bytes_before_external_group_by>

            <!-- Merge threads for coordinator -->
            <aggregation_memory_efficient_merge_threads>4</aggregation_memory_efficient_merge_threads>
        </default>
    </profiles>
</clickhouse>
```

## Conclusion

`distributed_aggregation_memory_efficient` is a critical setting for ClickHouse clusters running high-cardinality GROUP BY queries across many shards. Enable it by default in user profiles, pair it with `group_by_two_level_threshold` to ensure the bucketed merge path is active, and combine it with `max_bytes_before_external_group_by` for local disk spill on each shard. The result is a cluster that handles large distributed aggregations without requiring the coordinator to hold the full merge state in RAM.
