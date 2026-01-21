# How to Compact and Optimize ClickHouse Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Optimization, OPTIMIZE TABLE, Merges, Storage Efficiency

Description: A comprehensive guide to compacting and optimizing ClickHouse tables, covering OPTIMIZE TABLE operations, merge management, and storage efficiency best practices.

---

Regular table optimization in ClickHouse improves query performance and storage efficiency by consolidating parts and applying pending mutations.

## Understanding Parts and Merges

```sql
-- Check current parts
SELECT
    table,
    partition,
    name,
    rows,
    formatReadableSize(bytes_on_disk) AS size,
    modification_time
FROM system.parts
WHERE active AND table = 'events'
ORDER BY partition, modification_time;

-- Parts statistics
SELECT
    table,
    count() AS parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS total_size,
    formatReadableSize(sum(bytes_on_disk) / count()) AS avg_part_size
FROM system.parts
WHERE active
GROUP BY table
ORDER BY sum(bytes_on_disk) DESC;
```

## OPTIMIZE TABLE Operations

### Basic Optimization

```sql
-- Merge parts in a table
OPTIMIZE TABLE events;

-- Force merge all parts into one per partition
OPTIMIZE TABLE events FINAL;

-- Optimize specific partition
OPTIMIZE TABLE events PARTITION '202401';

-- Deduplicate during optimization (ReplacingMergeTree)
OPTIMIZE TABLE events FINAL DEDUPLICATE;

-- Deduplicate specific columns
OPTIMIZE TABLE events FINAL DEDUPLICATE BY user_id, timestamp;
```

### Non-Blocking Optimization

```sql
-- Run optimization asynchronously
SYSTEM START MERGES events;

-- Check merge progress
SELECT
    database,
    table,
    elapsed,
    progress,
    num_parts,
    formatReadableSize(total_size_bytes_compressed) AS size
FROM system.merges;
```

## Merge Configuration

```xml
<!-- config.d/merges.xml -->
<clickhouse>
    <merge_tree>
        <!-- Maximum parts per partition before blocking inserts -->
        <parts_to_throw_insert>300</parts_to_throw_insert>

        <!-- Target number of parts per partition -->
        <parts_to_delay_insert>150</parts_to_delay_insert>

        <!-- Maximum total parts -->
        <max_parts_in_total>100000</max_parts_in_total>

        <!-- Background merge threads -->
        <background_pool_size>16</background_pool_size>
    </merge_tree>
</clickhouse>
```

## Identifying Optimization Needs

```sql
-- Tables with too many parts
SELECT
    database,
    table,
    count() AS parts,
    sum(rows) AS rows
FROM system.parts
WHERE active
GROUP BY database, table
HAVING parts > 100
ORDER BY parts DESC;

-- Fragmented partitions
SELECT
    table,
    partition,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active AND table = 'events'
GROUP BY table, partition
HAVING parts > 10
ORDER BY partition;
```

## Scheduled Optimization

```bash
#!/bin/bash
# optimize_tables.sh - Run via cron

TABLES=("events" "logs" "metrics")

for table in "${TABLES[@]}"; do
    clickhouse-client --query "OPTIMIZE TABLE $table PARTITION tuple(toYYYYMM(now() - INTERVAL 1 MONTH))"
done
```

## Storage Reclamation

```sql
-- Check for unused parts
SELECT
    table,
    count() AS inactive_parts,
    formatReadableSize(sum(bytes_on_disk)) AS recoverable_space
FROM system.parts
WHERE NOT active
GROUP BY table;

-- Force cleanup of inactive parts
SYSTEM DROP MARK CACHE;
SYSTEM DROP UNCOMPRESSED CACHE;

-- Truncate old partitions
ALTER TABLE events DROP PARTITION '202301';
```

## Conclusion

Table optimization in ClickHouse involves:

1. **Regular OPTIMIZE** to merge small parts
2. **FINAL option** for complete consolidation
3. **Configuration tuning** for automatic merges
4. **Monitoring** parts count and size
5. **Scheduled maintenance** for consistent performance

Proper optimization reduces query latency and storage overhead.
