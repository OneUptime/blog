# How to Use UPDATE with ORDER BY in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Update, ORDER BY, DML, Limit

Description: Learn how MySQL's UPDATE with ORDER BY controls which rows are modified first, enabling priority-based updates and deterministic batch operations.

---

## Why ORDER BY Matters in UPDATE

Without `ORDER BY`, MySQL can update matching rows in any order. This is usually fine when all matching rows receive the same change. But when combined with `LIMIT`, or when the update logic depends on row sequence, `ORDER BY` becomes essential for predictable and correct results.

## Basic Syntax

```sql
UPDATE table_name
SET column = value
WHERE condition
ORDER BY sort_column [ASC|DESC]
LIMIT n;
```

`ORDER BY` in `UPDATE` primarily matters when paired with `LIMIT`. Without `LIMIT`, all matching rows are updated regardless of order, but `ORDER BY` still controls the processing sequence, which can affect user variable expressions and trigger execution order.

## Priority-Based Updates

Imagine a job queue where you want to assign the oldest unprocessed jobs to a worker:

```sql
UPDATE jobs
SET worker_id = 42,
    started_at = NOW()
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 10;
```

`ORDER BY created_at ASC` ensures the 10 oldest pending jobs are assigned, implementing a first-in-first-out (FIFO) queue.

## Expiring the Newest Records First

Conversely, use `DESC` to process the most recent rows first:

```sql
UPDATE sessions
SET expired = 1
WHERE last_activity < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
ORDER BY last_activity DESC
LIMIT 200;
```

Expiring the most recently inactive sessions first might be useful when you want to reclaim capacity from the least-needed sessions.

## Deterministic Batch Updates

When running iterative batch updates with `LIMIT`, including `ORDER BY` on an indexed column guarantees consistent progress:

```sql
UPDATE logs
SET archived = 1
WHERE archived = 0
ORDER BY id ASC
LIMIT 5000;
```

Each execution processes the next 5,000 unarchived logs by ascending ID, making it easy to track progress and resume safely after an interruption.

## Using ORDER BY Without LIMIT

While `ORDER BY` alone in an `UPDATE` has no effect on which rows are updated, it can matter for triggers or stored procedures that depend on row processing order:

```sql
UPDATE audit_trail
SET sequence_number = (@seq := @seq + 1)
ORDER BY event_time ASC;
```

Combined with a user variable, this assigns sequential numbers in chronological order.

## Restriction: No ORDER BY in Multi-Table UPDATE

MySQL does not support `ORDER BY` in multi-table `UPDATE` statements:

```sql
-- This will fail:
UPDATE orders o
JOIN customers c ON o.customer_id = c.id
SET o.priority = 'high'
WHERE c.tier = 'vip'
ORDER BY o.created_at ASC   -- ERROR
LIMIT 100;
```

For ordered multi-table updates, use a subquery to select the target IDs first:

```sql
UPDATE orders
SET priority = 'high'
WHERE id IN (
  SELECT id FROM (
    SELECT o.id
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE c.tier = 'vip'
    ORDER BY o.created_at ASC
    LIMIT 100
  ) AS sub
);
```

## Performance Considerations

Ensure the `ORDER BY` column is indexed to avoid a filesort, which scans all matching rows before sorting them:

```sql
EXPLAIN
UPDATE jobs
SET worker_id = 42
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 10;
```

Look for `Using filesort` in the `Extra` column. Adding a composite index on `(status, created_at)` eliminates the sort.

## Summary

`UPDATE ... ORDER BY ... LIMIT` enables deterministic, prioritized batch modifications in MySQL. Use it for FIFO job queues, staged data migrations, and any scenario where the sequence in which rows are updated matters. Always index the sort column to avoid performance-degrading filesorts.
