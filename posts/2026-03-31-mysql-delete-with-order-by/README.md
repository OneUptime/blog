# How to Use DELETE with ORDER BY in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Delete, ORDER BY, Limit, DML

Description: Learn how to use DELETE with ORDER BY in MySQL to control which rows are removed first, enabling predictable data purges and FIFO cleanup operations.

---

## When ORDER BY Matters in DELETE

Without `ORDER BY`, MySQL removes matching rows in an undefined order. For most bulk deletions this is acceptable. But when combined with `LIMIT`, `ORDER BY` determines exactly which rows are removed, making the operation deterministic and repeatable.

## Basic Syntax

```sql
DELETE FROM table_name
WHERE condition
ORDER BY sort_column [ASC|DESC]
LIMIT n;
```

`ORDER BY` only has observable meaning when `LIMIT` is also present. Without `LIMIT`, every matching row is deleted regardless of order.

## Purging the Oldest Records First

A common use case is a rolling data retention policy that deletes the oldest rows to keep storage bounded:

```sql
DELETE FROM audit_logs
WHERE archived = 1
ORDER BY created_at ASC
LIMIT 50000;
```

`ORDER BY created_at ASC` guarantees that the 50,000 oldest archived log rows are removed each execution, providing a predictable and auditable purge.

## Keeping Only the Newest N Rows

Delete everything except the most recent 1,000 rows for a given entity:

```sql
DELETE FROM sensor_readings
WHERE sensor_id = 7
ORDER BY recorded_at ASC
LIMIT (SELECT COUNT(*) - 1000 FROM sensor_readings WHERE sensor_id = 7);
```

Note: MySQL does not support a subquery in `LIMIT`. Compute the count in your application and pass it as a literal:

```python
cursor.execute(
    "SELECT COUNT(*) FROM sensor_readings WHERE sensor_id = %s",
    (sensor_id,)
)
count = cursor.fetchone()[0]
to_delete = max(0, count - 1000)
if to_delete > 0:
    cursor.execute(
        """DELETE FROM sensor_readings
           WHERE sensor_id = %s
           ORDER BY recorded_at ASC
           LIMIT %s""",
        (sensor_id, to_delete)
    )
    conn.commit()
```

## Deleting the Most Recent Rows First

For undo operations or rollback scenarios, delete the newest rows first:

```sql
DELETE FROM imports
WHERE batch_id = 99
ORDER BY id DESC
LIMIT 100;
```

This removes the last 100 rows imported for batch 99, in reverse insertion order.

## EXPLAIN to Verify Index Use

Ensure the `ORDER BY` column is indexed to avoid a full-table sort:

```sql
EXPLAIN
DELETE FROM audit_logs
WHERE archived = 1
ORDER BY created_at ASC
LIMIT 50000;
```

Look for `Using filesort` in the `Extra` column. A composite index on `(archived, created_at)` eliminates the sort and speeds up both filtering and ordering:

```sql
ALTER TABLE audit_logs ADD INDEX idx_archived_created (archived, created_at);
```

## Restriction: No ORDER BY in Multi-Table DELETE

`ORDER BY` is not supported in multi-table (JOIN-based) `DELETE` statements. Use a subquery with a nested `ORDER BY` to work around this:

```sql
DELETE FROM events
WHERE id IN (
  SELECT id FROM (
    SELECT id FROM events
    WHERE processed = 1
    ORDER BY created_at ASC
    LIMIT 10000
  ) AS sub
);
```

## Summary

`DELETE ... ORDER BY ... LIMIT` provides deterministic, priority-based data purges in MySQL. Use ascending order to remove the oldest data first (FIFO retention), descending order to undo recent insertions, and always index the sort column to prevent expensive filesorts.
