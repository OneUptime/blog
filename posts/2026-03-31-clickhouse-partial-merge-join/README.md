# How to Use partial_merge_join_rows_in_right_blocks in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Query, Join, Performance, Configuration, partial_merge_join_rows_in_right_blocks

Description: Learn how to tune partial_merge_join_rows_in_right_blocks in ClickHouse to control memory usage during partial merge joins with large right-side tables.

---

When ClickHouse performs a join with `join_algorithm = 'partial_merge'`, the right-hand table is divided into blocks that are sorted and merged with the left side. The setting `partial_merge_join_rows_in_right_blocks` controls how many rows ClickHouse puts into each right-side block during this process.

## When partial_merge Join Is Used

The partial merge join algorithm is activated when:
- `join_algorithm` is set to `partial_merge` or `auto`
- The right-side table is too large to fit in memory for a hash join
- You want predictable memory usage at the cost of some CPU overhead

```sql
SET join_algorithm = 'partial_merge';

SELECT
    l.order_id,
    l.amount,
    r.customer_name
FROM orders AS l
JOIN customers AS r ON l.customer_id = r.customer_id;
```

## Understanding partial_merge_join_rows_in_right_blocks

This setting determines the number of rows per sorted block on the right side of the join. A smaller value means smaller blocks and lower peak memory, but more merge passes. A larger value means fewer passes but higher memory.

Default value: `65536`

```sql
-- Check current value
SELECT value
FROM system.settings
WHERE name = 'partial_merge_join_rows_in_right_blocks';
```

## Setting the Value

Set it per session or per query:

```sql
-- Per session
SET partial_merge_join_rows_in_right_blocks = 32768;

-- Per query
SELECT
    l.user_id,
    l.event_type,
    r.segment
FROM events AS l
JOIN user_segments AS r ON l.user_id = r.user_id
SETTINGS
    join_algorithm = 'partial_merge',
    partial_merge_join_rows_in_right_blocks = 32768;
```

Set a default in `users.xml`:

```xml
<profiles>
  <default>
    <join_algorithm>partial_merge</join_algorithm>
    <partial_merge_join_rows_in_right_blocks>32768</partial_merge_join_rows_in_right_blocks>
  </default>
</profiles>
```

## Memory vs Performance Trade-off

The approximate memory used by right-side blocks at any time is:

```text
memory ~ partial_merge_join_rows_in_right_blocks * avg_row_bytes_right_table
```

For a right table with 200 bytes per row and the default 65536 block size:

```text
65536 * 200 = ~13 MB per block
```

If memory is tight, halving the block size to 32768 roughly halves the memory for right-side buffering.

## Verifying Join Algorithm in EXPLAIN

Use `EXPLAIN` to confirm which join algorithm was chosen:

```sql
EXPLAIN PIPELINE
SELECT
    l.session_id,
    r.channel
FROM sessions AS l
JOIN acquisition_sources AS r ON l.source_id = r.source_id
SETTINGS join_algorithm = 'partial_merge';
```

Look for `PartialMergeJoin` in the output to confirm partial merge was selected.

## Comparing Join Algorithms

```sql
-- Hash join: fast but loads entire right side into memory
SET join_algorithm = 'hash';

-- Partial merge: spills to sorted runs, lower memory, slower
SET join_algorithm = 'partial_merge';

-- Auto: ClickHouse picks based on memory and table size
SET join_algorithm = 'auto';
```

## Monitoring Join Memory Usage

After running large joins, inspect `system.query_log` for memory metrics:

```sql
SELECT
    query_id,
    formatReadableSize(memory_usage) AS memory,
    query_duration_ms AS duration_ms,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND has(tables, 'default.customers')
ORDER BY event_time DESC
LIMIT 10;
```

## Best Practices

- Use `partial_merge` join when the right table exceeds available memory for a hash join
- Start with the default 65536 and reduce if you see memory pressure
- Combine with `max_memory_usage` to prevent any single join from consuming too much RAM
- If performance is too slow with `partial_merge`, consider pre-sorting the right table or using a Dictionary for lookups

## Summary

`partial_merge_join_rows_in_right_blocks` gives you fine-grained control over how ClickHouse chunks the right table during partial merge joins. Tuning this value lets you balance memory consumption against join throughput when working with large datasets that cannot fit entirely in RAM.
