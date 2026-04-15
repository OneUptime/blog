# How ClickHouse Merges Data Parts - The Merge Process

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Merge, Internal, Storage

Description: Understand how ClickHouse's background merge process works - how parts are selected, sorted, written, and replaced - and how to monitor and tune it.

---

## Why ClickHouse Merges Parts

Every INSERT creates a new immutable part on disk. Without merging, queries would need to read thousands of small parts, which is slow and wasteful. ClickHouse runs background merge threads that continuously combine smaller parts into larger ones, improving query performance and reducing storage overhead.

## The Merge Selection Algorithm

ClickHouse selects parts for merging using a scoring algorithm that balances several factors:

- Total size of the resulting merged part (must not exceed `max_bytes_to_merge_at_max_space_in_pool`)
- Time parts have been sitting unmerged
- Number of parts in a partition (more parts = higher urgency)
- Write amplification cost (larger merges cost more I/O)

View currently running merges:

```sql
SELECT database, table, elapsed, progress, rows_read, rows_written
FROM system.merges
WHERE table = 'events';
```

## The Merge Execution Steps

When a merge is scheduled, ClickHouse:

1. Reads all source parts column by column
2. Merges the sorted streams (parts are already sorted by ORDER BY key)
3. Applies deduplication if using ReplacingMergeTree, or row collapsing if using CollapsingMergeTree
4. Applies TTL deletions if configured
5. Writes the new merged part to a temporary directory
6. Atomically renames it to the final part name
7. Marks old parts as inactive (they are deleted after `old_parts_lifetime` seconds)

## Part Naming After a Merge

```text
Before: 20240101_1_1_0  20240101_2_2_0  20240101_3_3_0
After:  20240101_1_3_1
```

The merge level (last number) increments. `1_3` means the merged part spans block numbers 1 through 3.

## Monitoring Merge Health

```sql
-- Count active parts per partition
SELECT partition, count() AS part_count
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY partition
ORDER BY part_count DESC;

-- Check merge throughput
SELECT event_time, CurrentMetric_BackgroundMergesAndMutationsPoolTask
FROM system.metric_log
ORDER BY event_time DESC
LIMIT 20;
```

## Tuning Merge Settings

```xml
<!-- Allow more concurrent merges (server-level setting in config.xml) -->
<background_pool_size>8</background_pool_size>
```

```sql
-- Increase max merge size to reduce part count faster
ALTER TABLE events MODIFY SETTING
    max_bytes_to_merge_at_max_space_in_pool = 214748364800; -- 200 GiB
```

## Too Many Parts Error

If inserts are faster than merges, ClickHouse will eventually raise:

```text
Too many parts (3000). Merges are processing significantly slower than inserts.
```

Fix this by batching inserts (no more than one INSERT per second, with thousands of rows per batch), or increasing merge threads.

## Summary

ClickHouse's background merge process continuously combines small parts into larger ones by reading sorted streams, applying table-level logic (deduplication, TTL), and atomically swapping old parts for the merged result. Monitoring part counts and tuning merge pool settings keeps the system healthy as insert rates grow.
