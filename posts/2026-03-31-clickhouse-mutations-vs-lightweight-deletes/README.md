# What Is the Difference Between Mutations and Lightweight Deletes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Mutation, Lightweight Delete, MergeTree, Data Management

Description: Compare ClickHouse mutations and lightweight deletes, understand how each modifies data on disk, their performance characteristics, and when to use each approach.

## Introduction

ClickHouse is designed as an append-only analytical database. It does not support the transactional `UPDATE` and `DELETE` semantics you find in PostgreSQL or MySQL. However, two mechanisms exist for modifying or removing data after it has been written: **mutations** and **lightweight deletes**.

These mechanisms work very differently at the storage level, and choosing the wrong one can significantly impact performance and cluster stability.

## Mutations

A mutation is a heavy background operation that rewrites entire data parts on disk. When you execute:

```sql
ALTER TABLE events UPDATE event_type = 'page_view' WHERE event_type = 'PageView';
```

or:

```sql
ALTER TABLE events DELETE WHERE occurred_at < '2023-01-01';
```

ClickHouse does not modify the existing data files. Instead, it:
1. Creates a new version of every data part that contains any affected rows
2. Rewrites all columns in those parts with the modified values
3. Marks the old parts as inactive
4. Deletes the old parts during the next merge

This is a full part rewrite. For a 100GB data part, a mutation that changes one row still rewrites all 100GB.

### Running a Mutation

```sql
-- Update a column value
ALTER TABLE user_events
    UPDATE category = 'corrected_category'
    WHERE category = 'wrong_category';

-- Delete rows matching a condition
ALTER TABLE user_events
    DELETE WHERE occurred_at < toDate('2022-01-01');
```

### Checking Mutation Status

Mutations run asynchronously. Check progress in `system.mutations`:

```sql
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    is_done,
    parts_to_do,
    latest_fail_reason
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time DESC;
```

```sql
-- See all recent mutations including completed ones
SELECT
    mutation_id,
    command,
    create_time,
    is_done,
    parts_to_do
FROM system.mutations
WHERE table = 'user_events'
ORDER BY create_time DESC
LIMIT 20;
```

### Killing a Running Mutation

```sql
KILL MUTATION WHERE table = 'user_events' AND mutation_id = 'mutation_123.txt';
```

### Cost and Impact of Mutations

- **Disk I/O** - extremely high; rewrites entire parts even when a tiny fraction of rows match
- **Write amplification** - significant; a mutation on a 1TB table may write 1TB+ of data
- **Read performance** - degraded during mutation because background I/O competes with queries
- **Cluster impact** - on `ReplicatedMergeTree`, mutations propagate to all replicas (each replica rewrites independently)

Mutations are designed for occasional, large-scale corrections - not routine data modifications.

## Lightweight Deletes

Lightweight deletes (introduced in ClickHouse 22.8) mark rows as deleted using a hidden `_row_exists` column instead of rewriting data parts. They are much cheaper than mutations for row-level deletions.

```sql
DELETE FROM user_events WHERE user_id = 'U-9999';
```

Internally, this adds a mask over the affected rows. The rows are not immediately removed from disk. Instead:
1. A hidden column `_row_exists` is updated to `0` for matching rows (via a small metadata change)
2. At query time, rows with `_row_exists = 0` are filtered out automatically
3. During the next background merge, the deleted rows are physically removed

### Checking Lightweight Delete Behavior

```sql
-- Deleted rows are hidden from normal queries
SELECT count() FROM user_events WHERE user_id = 'U-9999';
-- Returns 0 immediately after DELETE

-- The rows are still on disk until the next merge
-- Check physical row count including deleted rows
SELECT count() FROM user_events WHERE user_id = 'U-9999'
SETTINGS apply_deleted_mask = 0;  -- bypass the deletion mask
```

### Limitations of Lightweight Deletes

Lightweight deletes have constraints that do not apply to mutations:

1. **No UPDATE** - only `DELETE` is supported; there is no lightweight update mechanism
2. **Eventual physical removal** - deleted rows are still on disk until the next merge (important for compliance use cases)
3. **ReplicatedMergeTree only for async behavior** - on plain MergeTree, lightweight deletes convert to mutations
4. **Not supported on all engines** - only available on MergeTree family tables
5. **Performance at query time** - the deleted row filter adds a small overhead to every query that touches affected parts

```sql
-- Check if lightweight deletes are enabled for a table
SHOW CREATE TABLE user_events;
-- Look for `allow_experimental_lightweight_delete = 1` in SETTINGS
```

Enable the setting if needed (only required on ClickHouse versions before 23.3, as it defaults to enabled from 23.3 onward):

```sql
SET allow_experimental_lightweight_delete = 1;
-- or in the table settings:
ALTER TABLE user_events MODIFY SETTING allow_experimental_lightweight_delete = 1;
```

## Side-by-Side Comparison

| Aspect | Mutation | Lightweight Delete |
|---|---|---|
| Mechanism | Rewrites entire data parts | Sets hidden deletion mask |
| Disk write cost | Very high (full part rewrite) | Very low (metadata update) |
| Availability | ClickHouse 1.0+ | ClickHouse 22.8+ |
| Supports UPDATE | Yes | No |
| Supports DELETE | Yes | Yes |
| Physical removal timing | During mutation (background) | During next merge |
| Impact on reads | High (I/O contention) | Low |
| Impact on replicas | Each replica rewrites | Low coordination overhead |
| Best for | Large-scale bulk corrections | Row-level GDPR deletions |
| Compliance (GDPR) | Data is physically removed | Data removed only after merge |

## When to Use Each

**Use mutations when:**
- You need to update column values (not just delete rows)
- You are doing a bulk correction affecting many rows across many parts
- You need guaranteed physical removal immediately (GDPR right-to-erasure with verification)
- You are performing a one-time schema migration on existing data

**Use lightweight deletes when:**
- You are deleting individual rows or small sets (e.g., a specific user's data)
- Minimizing write amplification is important
- You need the delete to be immediately invisible to queries (mask is applied instantly)
- Physical disk removal can wait until the next background merge

## Practical Example: GDPR Right-to-Erasure

For GDPR compliance, you need to delete all rows associated with a user:

```sql
-- Lightweight delete: immediately invisible, physically removed after next merge
DELETE FROM user_events WHERE user_id = 'U-12345';
DELETE FROM user_sessions WHERE user_id = 'U-12345';
DELETE FROM user_profiles WHERE user_id = 'U-12345';
```

If you need to verify physical removal (e.g., for a compliance audit):

```sql
-- Force physical removal
OPTIMIZE TABLE user_events FINAL;  -- only do this on small tables
```

Or schedule the verification after several days to allow background merges to process.

## Monitoring Physical Row Counts

```sql
-- Check if any rows are masked by lightweight deletes
SELECT
    partition,
    rows,
    formatReadableSize(data_compressed_bytes) AS size
FROM system.parts
WHERE table = 'user_events'
  AND active = 1
ORDER BY partition;
```

After a merge, deleted rows are gone and `rows` decreases.

## Avoiding the Mutation Anti-Pattern

A common mistake is using mutations for real-time updates in an application:

```sql
-- BAD: This pattern generates constant mutation load
ALTER TABLE cart_items UPDATE quantity = 3 WHERE cart_id = 'cart-001' AND sku = 'SKU-42';
```

Instead, use `ReplacingMergeTree` for this pattern - insert a new row with the updated value and let the merge engine handle deduplication:

```sql
CREATE TABLE cart_items
(
    cart_id   String,
    sku       String,
    quantity  UInt32,
    updated_at DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (cart_id, sku);

-- Update: just insert a new row
INSERT INTO cart_items VALUES ('cart-001', 'SKU-42', 3, now());
```

## Conclusion

Mutations and lightweight deletes both modify data in ClickHouse but operate at very different cost levels. Mutations rewrite entire data parts and are appropriate for occasional bulk corrections. Lightweight deletes apply a fast deletion mask and are suitable for row-level deletions in operational workflows. For update semantics (changing a column value), `ReplacingMergeTree` with inserts is the recommended pattern rather than mutations.

**Related Reading:**

- [What Is CollapsingMergeTree and When to Use It](https://oneuptime.com/blog/post/2026-03-31-clickhouse-collapsingmergetree-guide/view)
- [What Is FINAL Keyword and When to Use It in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-final-keyword-guide/view)
- [What Is TTL in ClickHouse and How Data Lifecycle Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-ttl-data-lifecycle/view)
