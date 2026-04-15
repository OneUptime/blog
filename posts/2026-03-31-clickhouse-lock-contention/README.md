# How to Handle Lock Contention in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lock Contention, Mutation, ALTER, Performance, Concurrency

Description: Learn what causes lock contention in ClickHouse, how to identify it, and how to mitigate it for smooth concurrent operations.

---

ClickHouse is designed to minimize locking, but certain operations - especially mutations, ALTERs, and DROP TABLE - do acquire table-level locks that can block concurrent work. Understanding when contention occurs and how to avoid it keeps your cluster healthy.

## Types of Locks in ClickHouse

ClickHouse uses read-write locks at the table level:

- **Shared (read) locks** - Held by SELECT queries. Multiple readers can hold simultaneously.
- **Exclusive (write) locks** - Held by DDL operations (ALTER, DROP, RENAME). Blocks reads and other writes.

INSERTs on MergeTree tables do NOT acquire table-level locks - they write new parts directly and are safe to run concurrently with reads.

## Operations That Acquire Exclusive Locks

```sql
-- These acquire exclusive locks (briefly)
ALTER TABLE events ADD COLUMN new_col String;
RENAME TABLE events TO events_backup;
DROP TABLE old_events;
TRUNCATE TABLE temp_events;

-- These run asynchronously but may cause contention during scheduling
ALTER TABLE events UPDATE status = 'processed' WHERE id < 1000;  -- mutation
ALTER TABLE events DELETE WHERE created_at < '2020-01-01';        -- mutation
```

## Detecting Lock Waits

```sql
-- Check for queries waiting on locks
SELECT
    query_id,
    user,
    query,
    elapsed,
    ProfileEvents['RWLockReadersWaitMilliseconds'] AS read_wait_ms,
    ProfileEvents['RWLockWritersWaitMilliseconds'] AS write_wait_ms
FROM system.processes
WHERE ProfileEvents['RWLockReadersWaitMilliseconds'] > 100
   OR ProfileEvents['RWLockWritersWaitMilliseconds'] > 100
ORDER BY elapsed DESC;
```

## Monitoring Lock Wait History

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    avg(ProfileEvents['RWLockReadersWaitMilliseconds']) AS avg_read_wait_ms,
    max(ProfileEvents['RWLockReadersWaitMilliseconds']) AS max_read_wait_ms
FROM system.query_log
WHERE event_time >= now() - INTERVAL 1 HOUR
  AND type = 'QueryFinish'
GROUP BY minute
ORDER BY minute;
```

## Avoiding Mutation Lock Contention

Mutations (UPDATE/DELETE) in ClickHouse run as background jobs but briefly lock the table when registering. On high-traffic tables, schedule mutations during low-traffic windows:

```sql
-- Check pending mutations
SELECT database, table, command, is_done, parts_to_do
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time;
```

Cancel a slow mutation if needed:

```sql
KILL MUTATION WHERE database = 'default' AND table = 'events' AND mutation_id = '0000000001';
```

## Reducing ALTER Impact

For DDL that must run on busy tables, use non-blocking alternatives:

```sql
-- Adding a column is fast (metadata-only) on MergeTree
ALTER TABLE events ADD COLUMN IF NOT EXISTS labels Array(String) DEFAULT [];

-- Avoid modifying existing column types on large tables - prefer adding a new column
-- instead of ALTER TABLE events MODIFY COLUMN col_name NewType
```

## Limiting Concurrent Mutations

Prevent too many mutations from running simultaneously:

```sql
-- In config.xml or merge_tree settings
-- <background_pool_size>16</background_pool_size>
-- <background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>

-- Check active background work
SELECT metric, value
FROM system.metrics
WHERE metric IN ('BackgroundMergesAndMutationsPoolTask', 'BackgroundMergesAndMutationsPoolSize');
```

## Summary

ClickHouse lock contention most commonly occurs from concurrent DDL or mutation operations competing with reads. Use `system.processes` and `system.query_log` to detect lock wait times, schedule mutations during low-traffic periods, prefer metadata-only ALTERs (adding nullable columns), and cancel stuck mutations with `KILL MUTATION`. INSERTs on MergeTree tables are lock-free and safe to run at any time.
