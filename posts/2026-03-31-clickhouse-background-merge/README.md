# How to Configure Background Merge Settings in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Performance, Configuration, Merge, Tuning

Description: Configure ClickHouse background merge settings to control how quickly parts are merged, preventing 'too many parts' errors and balancing merge I/O against query performance.

---

## Introduction

MergeTree tables in ClickHouse accumulate small parts on every INSERT. Background merge threads continuously merge these small parts into larger ones. Proper tuning of background merge settings prevents "too many parts" errors, reduces query latency from part fragmentation, and balances the I/O load from merge operations.

## Merge Lifecycle

```mermaid
graph LR
    A[INSERT] --> B[New small part on disk]
    B --> C[Background merge selector]
    C --> D[Merge parts into larger part]
    D --> E[Delete original parts]
    E --> F[Fewer, larger parts]
    F --> G[Faster queries]
```

## Key Background Merge Settings

| Setting | Default | Description |
|---|---|---|
| `background_pool_size` | 16 | Number of threads for background merges (server-level) |
| `background_merges_mutations_concurrency_ratio` | 2 | Max concurrent merges/mutations = pool_size * ratio |
| `merge_max_block_size` | 8192 | Rows per block during merge |
| `max_bytes_to_merge_at_max_space_in_pool` | 161061273600 (150 GiB) | Max part size to merge when pool is free |
| `max_bytes_to_merge_at_min_space_in_pool` | 1048576 (1 MiB) | Max part size to merge when pool is busy |
| `number_of_free_entries_in_pool_to_execute_mutation` | 20 | Minimum free pool slots before mutations run |

## Configuring Background Pool Size

In `config.xml`:

```xml
<clickhouse>
  <background_pool_size>32</background_pool_size>
  <background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
</clickhouse>
```

On a 32-core server, `background_pool_size = 32` with ratio 2 allows up to 64 concurrent merges/mutations scheduled against the 32-thread pool.

## Per-Table Merge Settings

Override merge settings at the table level:

```sql
ALTER TABLE events
    MODIFY SETTING
        merge_max_block_size = 65536,
        max_bytes_to_merge_at_max_space_in_pool = 10737418240;  -- 10 GiB
```

Or at table creation:

```sql
CREATE TABLE events
(
    event_id   UInt64,
    event_time DateTime,
    payload    String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY event_time
SETTINGS
    merge_max_block_size = 65536,
    min_bytes_for_wide_part = 10485760,
    min_rows_for_wide_part = 0;
```

## Controlling the Merge Selector Aggressiveness

The `min_age_to_force_merge_seconds` setting forces merges of parts older than N seconds:

```sql
ALTER TABLE events
    MODIFY SETTING min_age_to_force_merge_seconds = 3600;  -- merge parts older than 1 hour
```

## Preventing "Too Many Parts" Errors

The error `DB::Exception: Too many parts (N). Merges are processing significantly slower than inserts` means inserts are faster than merges can keep up. Solutions:

1. Increase `background_pool_size`.
2. Reduce INSERT frequency (use async inserts or batch larger).
3. Increase `max_bytes_to_merge_at_max_space_in_pool`.

```xml
<background_pool_size>64</background_pool_size>
```

```sql
ALTER TABLE events
    MODIFY SETTING max_bytes_to_merge_at_max_space_in_pool = 322122547200;  -- 300 GiB
```

## Monitoring the Merge Queue

```sql
-- Check current merge queue depth
SELECT
    database,
    table,
    count() AS merges_in_queue,
    sum(total_size_bytes_compressed) AS bytes_to_merge
FROM system.merges
GROUP BY database, table
ORDER BY bytes_to_merge DESC;
```

```sql
-- Check parts count per table partition
SELECT
    partition,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY partition
ORDER BY parts DESC;
```

## Pausing and Resuming Merges

Pause merges before a large data load to free I/O for inserts:

```sql
SYSTEM STOP MERGES events;

-- Do bulk insert here

SYSTEM START MERGES events;
```

## Tuning the Merge Scheduling Policy

`background_merges_mutations_scheduling_policy` selects the algorithm that picks the next merge or mutation to run from the background pool. `round_robin` (the default) prevents starvation of large merges, while `shortest_task_first` finishes small merges faster at the risk of starving large ones under heavy insert load:

```xml
<clickhouse>
  <background_merges_mutations_scheduling_policy>shortest_task_first</background_merges_mutations_scheduling_policy>
</clickhouse>
```

## Summary

Background merges in ClickHouse combine small parts into larger ones to keep query performance high and avoid "too many parts" errors. Key levers are `background_pool_size` (number of merge threads), `max_bytes_to_merge_at_max_space_in_pool` (largest part eligible for merge), and per-table settings like `min_age_to_force_merge_seconds`. Monitor the merge queue with `system.merges` and pause merges with `SYSTEM STOP MERGES` during high-throughput insert windows.
