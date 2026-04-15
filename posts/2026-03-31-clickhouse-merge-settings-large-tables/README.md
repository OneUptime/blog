# How to Configure ClickHouse Merge Settings for Large Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Merge, Large Table, Configuration, Performance, MergeTree

Description: Tune ClickHouse merge settings to keep large tables healthy, reduce part count, and prevent merge storms that degrade insert and query performance.

---

## Why Merge Settings Matter for Large Tables

ClickHouse inserts create small data parts that are merged in the background. For large tables with billions of rows, merges must balance:
- Keeping part count low (too many parts = "Too many parts" errors)
- Not merging too aggressively (merge IO competes with queries and inserts)
- Not creating parts so large they take forever to merge

## Key Merge Settings

```sql
ALTER TABLE my_large_table MODIFY SETTING
    max_bytes_to_merge_at_max_space_in_pool = 161061273600,  -- 150 GB
    max_bytes_to_merge_at_min_space_in_pool = 1048576,       -- 1 MB
    merge_max_block_size = 8192,
    number_of_free_entries_in_pool_to_lower_max_size_of_merge = 8,
    min_bytes_for_wide_part = 10485760;
```

## Background Pool Size

Increase the merge pool for servers with fast SSDs and many cores:

```xml
<!-- config.xml -->
<background_pool_size>16</background_pool_size>
<background_merges_mutations_concurrency_ratio>3</background_merges_mutations_concurrency_ratio>
```

The concurrency ratio controls how many merges run simultaneously relative to the pool size.

## Controlling Maximum Part Size

Prevent merges from creating parts that are too large to re-merge efficiently:

```sql
ALTER TABLE my_large_table MODIFY SETTING
    max_bytes_to_merge_at_max_space_in_pool = 53687091200;  -- 50 GB cap
```

For tables with data retention via TTL, this prevents creating massive parts that won't expire for a long time.

## Merge Selector Behavior

ClickHouse uses a SimpleMergeSelector that picks part groups to minimize write amplification. You can influence it:

```sql
ALTER TABLE my_large_table MODIFY SETTING
    merge_selector_base = 5,
    merge_selector_enable_heuristic_to_remove_small_parts_at_right = 1;
```

## Monitoring Merge Progress

Check the current merge queue:

```sql
SELECT
    table,
    progress,
    elapsed,
    rows_read,
    rows_written,
    num_parts,
    result_part_name
FROM system.merges
ORDER BY elapsed DESC;
```

Check part distribution:

```sql
SELECT
    table,
    count() AS part_count,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS total_size,
    max(rows) AS max_part_rows
FROM system.parts
WHERE active AND database = 'default'
GROUP BY table
ORDER BY part_count DESC;
```

## Forcing Merges

For maintenance, trigger manual merges:

```sql
OPTIMIZE TABLE my_large_table FINAL;
```

On very large tables, optimize partition by partition to avoid locking too much data at once:

```sql
OPTIMIZE TABLE my_large_table PARTITION '2026-01' FINAL;
```

## Summary

Configure ClickHouse merge settings for large tables by increasing the background pool size, capping maximum merge size to avoid single-part giants, and tuning merge selector heuristics. Monitor `system.merges` to detect stalled merges and use partition-scoped `OPTIMIZE` for manual maintenance without full-table locks.
