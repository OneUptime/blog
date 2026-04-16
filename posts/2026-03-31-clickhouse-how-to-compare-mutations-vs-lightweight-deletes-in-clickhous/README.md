# How to Compare Mutations vs Lightweight Deletes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Mutation, Lightweight Delete, Delete, Performance, MergeTree

Description: Compare mutations and lightweight deletes in ClickHouse to understand when to use each approach for removing or updating rows, with performance trade-offs explained.

---

## What Are Mutations in ClickHouse

Mutations are background operations in ClickHouse that modify existing data in MergeTree tables. They rewrite data parts on disk to reflect the change. Common mutation operations include:

- `DELETE WHERE condition` - remove rows
- `UPDATE column = value WHERE condition` - modify column values
- `ALTER TABLE t MATERIALIZE COLUMN` - recalculate generated columns

## What Are Lightweight Deletes

Lightweight deletes (introduced in ClickHouse 22.8 as experimental, GA since 23.3) mark rows as deleted using a hidden bitmask without immediately rewriting data parts. The deletion is logically immediate but physically deferred until the next merge.

## Syntax Comparison

### Mutations

```sql
-- Mutation-based DELETE
ALTER TABLE events DELETE WHERE user_id = 1001;

-- Mutation-based UPDATE
ALTER TABLE events UPDATE status = 'cancelled' WHERE order_id = 999;

-- Check mutation status
SELECT
    command,
    create_time,
    is_done,
    parts_to_do,
    latest_failed_part
FROM system.mutations
WHERE database = 'default' AND table = 'events'
ORDER BY create_time DESC
LIMIT 10;
```

### Lightweight Deletes

```sql
-- Lightweight DELETE (standard SQL syntax)
DELETE FROM events WHERE user_id = 1001;

-- Optionally delete within a specific partition
DELETE FROM events IN PARTITION '2026-03' WHERE user_id = 1001;
```

Lightweight deletes are enabled by default since ClickHouse 23.3. On older versions (22.8–23.2), you must enable the session-level setting first:

```sql
-- Only needed on ClickHouse versions before 23.3
SET allow_experimental_lightweight_delete = 1;
```

Control synchronous vs. asynchronous behaviour with `lightweight_deletes_sync`:

```sql
-- Wait for the mask update to finish before returning (default: 2)
SET lightweight_deletes_sync = 2;
```

## How They Work Under the Hood

### Mutations

1. Mark matching parts for rewriting
2. Background worker rewrites each part without the deleted rows
3. Old parts replaced with new parts
4. Potentially reads and rewrites entire partitions

### Lightweight Deletes

1. Create a hidden `_row_exists` column bitmask
2. Mark deleted rows as 0 in the bitmask immediately
3. Filter applied during all SELECT queries (adds WHERE `_row_exists = 1`)
4. Physical cleanup happens during the next merge

## Performance Comparison

| Aspect | Mutations | Lightweight Deletes |
|---|---|---|
| Logical delete latency | Minutes to hours | Immediate |
| Physical data rewrite | Yes, immediately triggered | Deferred to next merge |
| Query overhead | None after completion | Small filter overhead per query |
| Disk space freed | Immediately after rewrite | Only after merge |
| Impact on merges | High (competes with background merges) | Low |
| Concurrent operations | Serialized (one mutation at a time) | Multiple lightweight deletes OK |
| Replicated tables | Replicated to all replicas | Replicated to all replicas |

## Checking Mutation Progress

```sql
-- View all active mutations
SELECT
    table,
    command,
    create_time,
    is_done,
    parts_to_do,
    parts_to_do_names
FROM system.mutations
WHERE NOT is_done
  AND database = 'default'
ORDER BY create_time;
```

## Cancelling a Mutation

```sql
-- Cancel a running mutation
KILL MUTATION WHERE table = 'events' AND mutation_id = '0000000001';
```

## Checking Lightweight Delete State

```sql
-- Count soft-deleted rows (not yet physically removed)
SELECT count()
FROM events
WHERE NOT _row_exists;  -- Internal column
```

## When to Use Mutations

- GDPR/compliance data removal that must be physically deleted from disk
- Large batch deletes (millions of rows from entire partitions)
- UPDATE operations (mutations are the only way to update non-primary-key columns)
- When you can tolerate delayed execution

## When to Use Lightweight Deletes

- Frequent small deletes (individual records)
- Real-time delete workflows where logical delete must be immediate
- High-frequency delete operations that would block mutations
- Temporary data marking before a batch cleanup

## Example - GDPR Right to Erasure

```sql
-- Using mutation (physically removes data - preferred for GDPR compliance)
ALTER TABLE user_events DELETE WHERE user_id = 12345;

-- Using lightweight delete (logically removes but physically deferred)
DELETE FROM user_events WHERE user_id = 12345;
```

For GDPR, use mutations to ensure data is physically removed. After the mutation completes, verify:

```sql
SELECT count() FROM user_events WHERE user_id = 12345;  -- Should return 0
```

## Summary

Mutations and lightweight deletes solve the same problem with different trade-offs. Use mutations for large batch operations, UPDATE requirements, and cases where physical data removal is mandatory (compliance). Use lightweight deletes for frequent small-record deletions where logical immediacy matters and you can tolerate deferred physical cleanup. In both cases, prefer partition-level deletes over row-level deletes when possible to minimize the amount of data that needs to be rewritten.
