# How to Diagnose ClickHouse Disk IO Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Disk IO, Diagnosis, Performance, Merge, Storage

Description: Diagnose ClickHouse disk IO spikes by correlating system metrics with merge activity, query scans, and insert patterns to identify the root cause.

---

## Common Causes of Disk IO Spikes

Disk IO spikes in ClickHouse come from four main sources:

1. **Background merges** reading and writing large parts
2. **Full table scans** from unoptimized queries
3. **Burst inserts** creating many small parts simultaneously
4. **Mutations** (ALTER TABLE UPDATE/DELETE) rewriting parts

## Step 1 - Check Merge Activity

```sql
SELECT
    table,
    progress,
    elapsed,
    formatReadableSize(total_size_bytes_compressed) AS total_size,
    rows_read,
    rows_written
FROM system.merges
ORDER BY total_size_bytes_compressed DESC;
```

Large active merges are often the primary IO cause. One 50 GB merge reads and writes 50+ GB sequentially.

## Step 2 - Check Query IO Usage

Find the most IO-intensive recent queries:

```sql
SELECT
    query_id,
    user,
    formatReadableSize(read_bytes) AS read_bytes,
    formatReadableSize(written_bytes) AS written_bytes,
    read_rows,
    query_duration_ms AS ms,
    query
FROM system.query_log
WHERE event_date = today() AND type = 'QueryFinish'
ORDER BY read_bytes DESC
LIMIT 20;
```

## Step 3 - Check OS-Level IO

From the host OS:

```bash
iostat -x 1 10
```

Look at `%util` (disk utilization) and `await` (IO wait time per request). High `await` with low `%util` suggests small random reads; high `%util` suggests sustained throughput.

Identify which ClickHouse process is the IO source:

```bash
iotop -o -P
```

## Step 4 - Identify Insert Pressure

Check part count growth:

```sql
SELECT
    table,
    count() AS part_count,
    sum(rows) AS total_rows
FROM system.parts
WHERE active AND database = 'default'
GROUP BY table
HAVING part_count > 100
ORDER BY part_count DESC;
```

High part counts indicate insert pressure that triggers aggressive merging.

## Reducing Merge IO

Throttle merge throughput to protect query performance:

```xml
<!-- config.xml -->
<background_merges_mutations_concurrency_ratio>1</background_merges_mutations_concurrency_ratio>
<merge_tree>
    <max_bytes_to_merge_at_max_space_in_pool>10737418240</max_bytes_to_merge_at_max_space_in_pool>
</merge_tree>
```

Reduce merge concurrency during business hours using a scheduled cron that adjusts the pool size.

## Optimizing Queries for Less IO

Add primary key filters to avoid full scans:

```sql
-- Bad: scans all partitions
SELECT count() FROM events WHERE user_id = 42;

-- Good: prune partitions with date filter
SELECT count() FROM events
WHERE ts >= today() - 7 AND user_id = 42;
```

Use `EXPLAIN` to verify partition pruning:

```sql
EXPLAIN SELECT count() FROM events WHERE ts >= today() - 7 AND user_id = 42;
```

## Summary

Diagnose ClickHouse disk IO spikes by correlating merge activity from `system.merges`, query read bytes from `system.query_log`, and OS-level `iostat` output. The most common causes are large background merges and full-table scans. Fix by throttling merge concurrency, adding primary key filters to queries, and reducing insert frequency to lower part count.
