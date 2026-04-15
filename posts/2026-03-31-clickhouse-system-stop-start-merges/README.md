# How to Use SYSTEM STOP/START MERGES in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, System, MergeTree, Merge, Maintenance

Description: Learn how to use SYSTEM STOP MERGES and SYSTEM START MERGES in ClickHouse to pause and resume background merges during maintenance windows.

---

ClickHouse MergeTree tables rely on a continuous background merge process to consolidate small parts created by INSERT operations into larger, more efficient parts. This process runs automatically, but sometimes you need to pause it - during heavy bulk loads, maintenance windows, or when debugging merge-related issues. `SYSTEM STOP MERGES` and `SYSTEM START MERGES` give you explicit control. This post covers the syntax, per-table variants, and practical use cases.

## How MergeTree Merges Work

Every INSERT into a MergeTree table creates one or more parts on disk. ClickHouse's background merge scheduler continuously selects groups of small parts and merges them into larger parts. This keeps query performance high (fewer parts to scan) and frees disk space.

When merges are running, they consume CPU, I/O, and memory. Pausing merges temporarily frees those resources for other operations - at the cost of accumulating more parts while merges are stopped.

## SYSTEM STOP MERGES

Stop all background merges across all MergeTree tables in the server:

```sql
SYSTEM STOP MERGES;
```

After this command, no new merges will be started. Any merge already in progress will complete.

## SYSTEM START MERGES

Resume background merges after they were stopped:

```sql
SYSTEM START MERGES;
```

ClickHouse immediately resumes scheduling merges. Any parts that accumulated while merges were paused will be picked up by the scheduler.

## Per-Table Variants

You can stop and start merges for a single table, leaving all other tables unaffected:

```sql
-- Stop merges only on the events table
SYSTEM STOP MERGES events;

-- Resume merges only on the events table
SYSTEM START MERGES events;
```

With a fully qualified database.table name:

```sql
SYSTEM STOP MERGES my_database.events;
SYSTEM START MERGES my_database.events;
```

## Checking Merge Status

After stopping merges, verify that no new merges are running:

```sql
-- Check for currently running merges
SELECT
    database,
    table,
    elapsed,
    progress,
    num_parts,
    result_part_name,
    is_mutation
FROM system.merges
ORDER BY elapsed DESC;
```

An empty result confirms no merges are active.

For replicated tables, you can check whether merges are enabled on each replica:

```sql
SELECT
    database,
    table,
    is_leader,
    can_perform_merges
FROM system.replicas;
```

A `can_perform_merges` value of `0` indicates merges are stopped on that replica. For non-replicated tables, check the server logs or simply verify that `system.merges` remains empty after stopping merges.

## Checking Part Count Before and After

```sql
-- Check part count before stopping merges
SELECT
    table,
    count()   AS active_parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size
FROM system.parts
WHERE active
  AND database = currentDatabase()
GROUP BY table
ORDER BY active_parts DESC;
```

## Practical Use Cases

### Bulk Load Window

During a large bulk insert, stopping merges prevents resource contention between the insert and background merges:

```sql
-- Pause merges before bulk load
SYSTEM STOP MERGES events;

-- Run bulk insert
INSERT INTO events
SELECT * FROM events_staging
SETTINGS max_insert_block_size = 1048576;

-- Resume merges after the load completes
SYSTEM START MERGES events;
```

### Schema Migration with ALTER TABLE

Some `ALTER TABLE` operations (like adding columns to large tables) are faster when background merges are not competing for I/O:

```sql
SYSTEM STOP MERGES events;

ALTER TABLE events ADD COLUMN session_id String DEFAULT '';

SYSTEM START MERGES events;
```

### Replicated Table Maintenance

On a replicated cluster, you can stop merges on one replica during maintenance without affecting the others:

```sql
-- On the replica being serviced
SYSTEM STOP MERGES;

-- Perform maintenance (disk expansion, memory upgrade, etc.)

-- After maintenance completes
SYSTEM START MERGES;
```

### Debugging Unexpected Merge Behavior

If a merge is consuming unexpected resources, stop merges to isolate the issue:

```sql
-- Stop all merges immediately
SYSTEM STOP MERGES;

-- Inspect currently running merges before they finish
SELECT
    database,
    table,
    elapsed,
    memory_usage,
    rows_read,
    rows_written
FROM system.merges;

-- Resume when ready
SYSTEM START MERGES;
```

## Important Considerations

- Stopping merges causes parts to accumulate. If merges are stopped for too long, SELECT queries may slow down because ClickHouse must read more parts.
- ClickHouse has a soft limit on the number of active parts per partition (default 300). Exceeding this limit causes inserts to slow down or block with a "too many parts" error.
- Always pair every `SYSTEM STOP MERGES` with a `SYSTEM START MERGES` - do not leave merges stopped indefinitely.

```sql
-- Monitor part count while merges are stopped
SELECT
    table,
    partition,
    count() AS parts
FROM system.parts
WHERE active
  AND database = currentDatabase()
GROUP BY table, partition
HAVING parts > 100
ORDER BY parts DESC;
```

## Summary

`SYSTEM STOP MERGES` and `SYSTEM START MERGES` give you precise control over ClickHouse background merge activity. Use the server-wide form during broad maintenance windows and the per-table form when targeting a specific table. Always resume merges promptly to avoid part accumulation, and monitor `system.parts` to ensure part counts remain manageable.
