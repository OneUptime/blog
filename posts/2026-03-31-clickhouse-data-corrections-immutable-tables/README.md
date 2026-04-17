# How to Handle Data Corrections in Immutable ClickHouse Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Correction, Mutation, ReplacingMergeTree, ALTER TABLE, MergeTree

Description: Apply corrections to already-inserted data in ClickHouse using ALTER TABLE UPDATE mutations and ReplacingMergeTree version patterns.

---

ClickHouse is append-only by design, but data errors inevitably require corrections. ClickHouse provides three mechanisms: lightweight deletes, asynchronous mutations (ALTER TABLE UPDATE/DELETE), and re-insertion with ReplacingMergeTree.

## Option 1 - ALTER TABLE UPDATE (Mutation)

Mutations rewrite parts on disk asynchronously:

```sql
ALTER TABLE orders
UPDATE amount = 149.99
WHERE order_id = 12345 AND toYYYYMM(order_date) = 202501;
```

The mutation runs in the background. Query progress:

```sql
SELECT
    command,
    is_done,
    parts_to_do,
    create_time
FROM system.mutations
WHERE table = 'orders' AND NOT is_done
ORDER BY create_time DESC;
```

Always include a partition predicate in the WHERE clause to limit parts that need rewriting.

## Option 2 - Lightweight DELETE

Introduced as experimental in ClickHouse 22.8 and generally available since 23.3, lightweight deletes mark rows as deleted immediately without rewriting parts:

```sql
DELETE FROM orders WHERE order_id = 12345;
```

Rows are hidden from queries immediately via a deletion mask but physically removed only during the next merge. This is much faster than full mutations for point deletions.

## Option 3 - ReplacingMergeTree Re-Insertion

For tables using ReplacingMergeTree, insert a corrected row with a higher version:

```sql
-- Original
INSERT INTO orders VALUES (12345, 7, 99.99, 1, '2025-01-15');

-- Correction: same primary key, higher version
INSERT INTO orders VALUES (12345, 7, 149.99, 2, '2025-01-15');
```

Query the corrected state:

```sql
SELECT order_id, user_id, amount
FROM orders FINAL
WHERE order_id = 12345;
```

## Correcting an Entire Partition

When an upstream pipeline wrote a bad partition, the most efficient fix is to drop and re-load it:

```sql
-- Drop the bad partition
ALTER TABLE orders DROP PARTITION '202501';

-- Re-insert corrected data
INSERT INTO orders SELECT * FROM orders_corrected_staging WHERE toYYYYMM(order_date) = 202501;
```

This is the fastest approach because it avoids per-row mutation overhead.

## Auditing What Was Changed

Before applying a mutation, capture the rows being changed:

```sql
INSERT INTO orders_correction_log
SELECT order_id, amount AS old_amount, now() AS corrected_at
FROM orders
WHERE order_id IN (12345, 12346);

ALTER TABLE orders UPDATE amount = 149.99 WHERE order_id IN (12345, 12346);
```

## Summary

Data corrections in ClickHouse use ALTER TABLE UPDATE mutations for broad changes, lightweight DELETEs for fast point removals, and re-insertion with higher version numbers for ReplacingMergeTree tables. For batch corrections affecting an entire partition, dropping and re-inserting is the most efficient approach. Always log what was corrected before applying changes.
