# How ClickHouse Manages Background Merges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Background Merge, MergeTree, Part, Lifecycle

Description: Explains the lifecycle of ClickHouse background merges, how parts are selected for merging, and how to monitor and tune the merge process for production tables.

---

## Why ClickHouse Merges Parts

Every INSERT into a MergeTree table creates a new data part. Background merges combine small parts into larger ones for two reasons:

1. **Query performance** - fewer, larger parts mean less metadata overhead and better sequential read patterns
2. **Engine semantics** - ReplacingMergeTree, SummingMergeTree, and CollapsingMergeTree apply their deduplication/aggregation logic only during merges

## Part Lifecycle

```text
INSERT --> new part created (e.g., all_5_5_0)
Background merger selects parts to merge
Parts all_1_4_0 + all_5_5_0 --> new merged part all_1_5_1
Old parts marked inactive, removed after grace period
```

The part naming convention is `partition_id_min_block_max_block_level`:
- `partition_id`: identifier of the partition (`all` when no `PARTITION BY` is set)
- `min_block`, `max_block`: range of insert blocks covered
- `level`: merge generation (higher = more times merged)

## Monitoring Parts and Merges

```sql
-- Current active parts per table
SELECT table, count() AS parts, sum(rows) AS total_rows
FROM system.parts
WHERE active = 1 AND database = 'analytics'
GROUP BY table
ORDER BY parts DESC;

-- In-progress merges
SELECT
  table,
  result_part_name,
  progress,
  elapsed,
  total_size_bytes_compressed
FROM system.merges;
```

## Merge Selection Algorithm

ClickHouse's merger selects parts based on:
- Parts must be in the same partition
- Parts must be adjacent (no gaps in block ranges)
- Merged size must not exceed `max_bytes_to_merge_at_max_space_in_pool`

Smaller parts are merged first (more urgent) to reduce part count quickly.

## Tuning Merge Settings

```xml
<!-- config.xml -->
<clickhouse>
    <!-- MergeTree defaults applied to all MergeTree tables -->
    <merge_tree>
        <!-- Maximum size of a merged part -->
        <max_bytes_to_merge_at_max_space_in_pool>161061273600</max_bytes_to_merge_at_max_space_in_pool>
    </merge_tree>

    <!-- Server-level setting: number of background merge threads -->
    <background_pool_size>16</background_pool_size>
</clickhouse>
```

Or at table level:

```sql
ALTER TABLE events MODIFY SETTING
  merge_max_block_size = 8192,
  number_of_free_entries_in_pool_to_lower_max_size_of_merge = 8;
```

## Too Many Parts Warning

If parts grow faster than merges reduce them, ClickHouse logs:

```text
Too many parts (300). Parts count: 350.
```

And inserts start throttling. Solutions:

```sql
-- Check which partitions have too many parts
SELECT partition, count() AS parts
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY partition
HAVING parts > 50
ORDER BY parts DESC;

-- Force merge for a problematic partition
OPTIMIZE TABLE events PARTITION '202603';
```

## Mutations Are Also Background Operations

`ALTER TABLE ... UPDATE` and `DELETE` create mutations that run in the background, similar to merges. They can block future merges on the same partition.

```sql
-- Check blocking mutations
SELECT table, command, parts_to_do, is_done
FROM system.mutations
WHERE is_done = 0;

-- Kill a stuck mutation if needed
KILL MUTATION WHERE table = 'events' AND mutation_id = 'mutation_1.txt';
```

## Summary

ClickHouse background merges consolidate small parts into larger ones, applying engine-specific logic (deduplication, summing, collapsing) in the process. Monitor part counts via `system.parts` and merges via `system.merges`. If parts accumulate faster than merges run, increase `background_pool_size` or reduce insert frequency. Force merges with `OPTIMIZE TABLE` when partition part counts are high.
