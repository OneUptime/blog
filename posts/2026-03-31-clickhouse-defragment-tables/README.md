# How to Defragment ClickHouse Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Defragmentation, OPTIMIZE, MergeTree, Performance

Description: Learn how to defragment ClickHouse tables using OPTIMIZE TABLE to merge data parts, reduce disk usage, and improve query performance.

---

ClickHouse "defragmentation" means forcing the merge of data parts into fewer, larger parts. While background merges handle this automatically, sometimes you need to trigger it manually to optimize storage layout and query performance.

## Understanding ClickHouse Fragmentation

ClickHouse stores data in immutable parts that are gradually merged by background processes. Fragmentation occurs when:

- Many small inserts create hundreds of tiny parts
- Background merges fall behind ingestion rate
- Merges are stopped or paused
- A table has many partitions with only a few parts each

## Checking Fragmentation Level

Measure fragmentation by looking at part counts and sizes:

```sql
SELECT
    database,
    table,
    partition,
    count() AS part_count,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS total_size,
    formatReadableSize(avg(bytes_on_disk)) AS avg_part_size
FROM system.parts
WHERE active = 1
GROUP BY database, table, partition
HAVING part_count > 10
ORDER BY part_count DESC
LIMIT 20;
```

High part counts (especially over 50 per partition) indicate fragmentation.

## Basic OPTIMIZE TABLE

Force a merge of all parts in a table:

```sql
OPTIMIZE TABLE my_database.events;
```

This triggers one round of merges. For a table with many parts, you may need to run it multiple times.

## OPTIMIZE TABLE FINAL

Force all parts in every partition to merge into a single part:

```sql
OPTIMIZE TABLE my_database.events FINAL;
```

`FINAL` is more thorough but takes longer and uses more IO. Only use it during maintenance windows.

## OPTIMIZE for Specific Partitions

For large tables, optimize one partition at a time to limit resource usage:

```sql
-- Optimize a specific month
OPTIMIZE TABLE events PARTITION '2026-03';

-- Optimize multiple partitions (OPTIMIZE takes one partition per statement,
-- so issue them separately)
OPTIMIZE TABLE events PARTITION '2026-01';
OPTIMIZE TABLE events PARTITION '2026-02';
OPTIMIZE TABLE events PARTITION '2026-03';
```

## Monitoring Merge Progress

Track the ongoing optimization:

```sql
SELECT
    table,
    partition_id,
    elapsed,
    progress,
    num_parts,
    result_part_name,
    formatReadableSize(total_size_bytes_compressed) AS size
FROM system.merges
ORDER BY elapsed DESC;
```

## Defragmentation Script

Run periodic optimization across all tables that need it:

```bash
#!/bin/bash
clickhouse-client --query "
SELECT DISTINCT database, table
FROM system.parts
WHERE active = 1
GROUP BY database, table
HAVING count() > 50
" | while IFS=$'\t' read -r db table; do
    echo "Optimizing $db.$table..."
    clickhouse-client --query "OPTIMIZE TABLE ${db}.${table}"
done
```

## Impact on ReplacingMergeTree and CollapsingMergeTree

For `ReplacingMergeTree` and `CollapsingMergeTree`, `OPTIMIZE FINAL` is especially important - it triggers the deduplication logic that removes superseded rows:

```sql
-- Force deduplication by merging all parts
OPTIMIZE TABLE my_replacing_table FINAL;

-- Verify row count after deduplication
SELECT count() FROM my_replacing_table;
SELECT count() FROM my_replacing_table FINAL;
```

The two counts should now be equal after `OPTIMIZE FINAL`.

## Scheduling Regular OPTIMIZE

Add periodic optimization to cron for tables that receive many small inserts:

```bash
# Run nightly at 3 AM on high-churn tables
0 3 * * * clickhouse-client --query "OPTIMIZE TABLE production.events PARTITION '$(date +%Y-%m)'"
```

## Summary

ClickHouse table defragmentation uses `OPTIMIZE TABLE` to force background merges, reducing part counts, improving query scan efficiency, and triggering deduplication in specialized MergeTree engines. Check fragmentation via `system.parts`, use `PARTITION` to scope large operations, run `FINAL` only during maintenance windows, and automate regular optimization for high-churn tables.
