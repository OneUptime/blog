# How to Configure ClickHouse Background Merges and Mutations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, MergeTree, Configuration, Performance, Operation

Description: Learn how to tune ClickHouse background merge and mutation settings to balance write throughput, query performance, and resource consumption on MergeTree tables.

---

ClickHouse MergeTree tables do not update data in place. Instead, every INSERT creates new data parts, and background merge processes continuously combine smaller parts into larger ones. Mutations (UPDATE and DELETE) work similarly: they rewrite parts in the background. Understanding and tuning these background processes is essential for keeping ClickHouse healthy under sustained write load.

## Why Merges Matter

Each INSERT creates one or more small parts on disk. If parts are never merged, queries must read from many small files, increasing I/O overhead. Conversely, merging too aggressively during peak write periods wastes I/O and CPU on background work at the expense of foreground queries.

The goal is a steady state where ClickHouse maintains a manageable number of parts per partition without consuming excessive resources.

## Key Background Merge Settings

All settings below are server-level settings in `/etc/clickhouse-server/config.xml` or a drop-in file, unless otherwise noted.

### background_pool_size

Controls the number of threads dedicated to background merge operations:

```xml
<clickhouse>
    <!-- Number of threads for background merges and mutations (default: 16) -->
    <background_pool_size>16</background_pool_size>
</clickhouse>
```

Increase this on write-heavy servers with many CPU cores. Decrease it on query-heavy servers to prioritize foreground query execution.

### background_merges_mutations_concurrency_ratio

Determines how many concurrent merge/mutation tasks a background pool thread can have:

```xml
<clickhouse>
    <!-- Each background thread can work on up to 2 tasks concurrently (default: 2) -->
    <background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
</clickhouse>
```

Effective maximum concurrent merges = `background_pool_size` * `background_merges_mutations_concurrency_ratio`.

### background_schedule_pool_size

Controls the pool for non-merge background tasks (replication, TTL processing, etc.):

```xml
<clickhouse>
    <background_schedule_pool_size>128</background_schedule_pool_size>
</clickhouse>
```

### background_fetches_pool_size

Controls threads used for fetching parts from replicas:

```xml
<clickhouse>
    <background_fetches_pool_size>8</background_fetches_pool_size>
</clickhouse>
```

## Merge-Related MergeTree Settings

These settings are MergeTree-engine settings. They can be set globally in the server's `<merge_tree>` section of `config.xml` or per-table via the `SETTINGS` clause on `CREATE TABLE` / `ALTER TABLE ... MODIFY SETTING`.

### max_bytes_to_merge_at_max_space_in_pool

The maximum total size of parts that can be merged in one merge operation:

```xml
<clickhouse>
    <merge_tree>
        <!-- Default: 150 GiB. Reduce to limit I/O spike from one large merge. -->
        <max_bytes_to_merge_at_max_space_in_pool>161061273600</max_bytes_to_merge_at_max_space_in_pool>
    </merge_tree>
</clickhouse>
```

### max_bytes_to_merge_at_min_space_in_pool

When free disk space is low, ClickHouse limits merge size to this value:

```xml
<clickhouse>
    <merge_tree>
        <!-- Default: 1 MiB. Keep small when disk is nearly full. -->
        <max_bytes_to_merge_at_min_space_in_pool>1048576</max_bytes_to_merge_at_min_space_in_pool>
    </merge_tree>
</clickhouse>
```

### number_of_free_entries_in_pool_to_execute_merge

ClickHouse will not start a new merge if fewer than this many background pool entries are free:

```xml
<clickhouse>
    <merge_tree>
        <!-- Default: 20. Higher value = more conservative merging under pool pressure. -->
        <number_of_free_entries_in_pool_to_execute_merge>20</number_of_free_entries_in_pool_to_execute_merge>
    </merge_tree>
</clickhouse>
```

### number_of_free_entries_in_pool_to_lower_max_size_of_merge

When the pool is busy, this threshold triggers reduction of the max merge size:

```xml
<clickhouse>
    <merge_tree>
        <number_of_free_entries_in_pool_to_lower_max_size_of_merge>8</number_of_free_entries_in_pool_to_lower_max_size_of_merge>
    </merge_tree>
</clickhouse>
```

## Mutation Settings

Mutations rewrite data parts to apply UPDATE or DELETE operations. They are expensive and run in the same background pool as merges.

### Issuing a Mutation

```sql
-- Delete rows older than 90 days
ALTER TABLE events
    DELETE WHERE event_date < today() - 90;

-- Update a column value
ALTER TABLE events
    UPDATE user_segment = 'premium'
    WHERE user_id IN (SELECT user_id FROM premium_users);
```

### Limiting Mutation Concurrency

```xml
<clickhouse>
    <merge_tree>
        <!-- Maximum number of part mutations per replica (default: 0, meaning no limit) -->
        <max_number_of_mutations_for_replica>8</max_number_of_mutations_for_replica>
    </merge_tree>
</clickhouse>
```

### mutations_sync Setting

By default, ALTER ... DELETE and ALTER ... UPDATE return immediately and run asynchronously. To wait for completion:

```sql
-- Wait for mutation to finish on all replicas before returning
ALTER TABLE events
    DELETE WHERE event_date < '2023-01-01'
SETTINGS mutations_sync = 2;
-- mutations_sync = 1: wait for this replica only
-- mutations_sync = 2: wait for all replicas
```

## Monitoring Background Merges

```sql
-- Currently running merges
SELECT
    database,
    table,
    elapsed,
    progress,
    num_parts,
    result_part_name,
    is_mutation,
    total_size_bytes_compressed,
    bytes_read_uncompressed,
    bytes_written_uncompressed,
    thread_id
FROM system.merges
ORDER BY elapsed DESC;
```

```sql
-- Background pool utilization
SELECT
    pool_type,
    thread_count,
    task_count,
    max_task_wait_ms
FROM system.thread_pools
WHERE pool_type LIKE '%MergeTree%';
```

```sql
-- Part count per table (high part count indicates merge lag)
SELECT
    database,
    table,
    count() AS active_parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS size_on_disk
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY active_parts DESC
LIMIT 20;
```

## Monitoring Mutations

```sql
-- All pending and recent mutations
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    parts_to_do,
    is_done,
    latest_failed_part,
    latest_fail_reason
FROM system.mutations
WHERE is_done = 0
   OR latest_fail_reason != ''
ORDER BY create_time DESC;
```

## Forcing a Manual Merge

In rare cases you may want to force ClickHouse to merge all parts in a partition immediately:

```sql
-- Merge all parts in the 2024-01 partition
OPTIMIZE TABLE events PARTITION '202401';

-- Force a final merge even if only one part exists
OPTIMIZE TABLE events PARTITION '202401' FINAL;
```

`OPTIMIZE FINAL` is expensive on large tables. Use it sparingly, such as before archiving a partition.

## Part Count Alert Thresholds

A part count that grows without bound indicates that merges are falling behind inserts. ClickHouse itself enforces soft and hard limits:

```xml
<clickhouse>
    <merge_tree>
        <!-- Slow down inserts when part count exceeds this threshold (default: 1000) -->
        <parts_to_delay_insert>1000</parts_to_delay_insert>

        <!-- Maximum delay to apply to INSERTs when parts_to_delay_insert is exceeded (seconds, default: 1) -->
        <max_delay_to_insert>1</max_delay_to_insert>

        <!-- Reject inserts entirely when part count exceeds this threshold (default: 3000) -->
        <parts_to_throw_insert>3000</parts_to_throw_insert>
    </merge_tree>
</clickhouse>
```

If you regularly see insert delays, either increase `background_pool_size`, reduce the insert rate, or increase `parts_to_delay_insert` as a temporary measure.

## Recommended Configuration for a Write-Heavy Server

```xml
<clickhouse>
    <!-- More threads for background work on a 32-core server -->
    <background_pool_size>32</background_pool_size>
    <background_schedule_pool_size>128</background_schedule_pool_size>
    <background_fetches_pool_size>16</background_fetches_pool_size>

    <merge_tree>
        <!-- Allow merges up to 150 GiB -->
        <max_bytes_to_merge_at_max_space_in_pool>161061273600</max_bytes_to_merge_at_max_space_in_pool>

        <!-- Raise thresholds to absorb bursty writes before delay/throw kicks in -->
        <parts_to_delay_insert>2000</parts_to_delay_insert>
        <parts_to_throw_insert>5000</parts_to_throw_insert>

        <!-- Reserve pool slots before starting new merges -->
        <number_of_free_entries_in_pool_to_execute_merge>20</number_of_free_entries_in_pool_to_execute_merge>
    </merge_tree>
</clickhouse>
```

## Conclusion

Background merges and mutations are the engine that keeps MergeTree healthy under continuous write load. Size `background_pool_size` based on your core count and write rate, monitor part counts via `system.parts`, and watch `system.merges` for stalled or slow operations. Use `OPTIMIZE TABLE` sparingly for manual intervention, and tune the insert delay thresholds in `<merge_tree>` to prevent the table from accumulating too many small parts during merge lag.
