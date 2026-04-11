# How to Optimize UPDATE Performance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Performance, InnoDB, Optimization

Description: Learn how to optimize MySQL UPDATE statements by adding proper indexes, batching large updates, avoiding lock contention, and rewriting multi-table updates efficiently.

---

## Why UPDATE Can Be Slow

UPDATE operations in MySQL are more expensive than reads because they must:
1. Find the rows to update (requires a WHERE clause index)
2. Acquire row-level locks on matching rows
3. Write changes to the InnoDB buffer pool
4. Update all secondary indexes that cover modified columns
5. Flush the redo log

## Index the WHERE Clause First

The most critical optimization is ensuring MySQL can find rows to update without a full table scan:

```sql
-- Run EXPLAIN before executing large updates
EXPLAIN UPDATE orders SET shipped_at = NOW() WHERE status = 'ready_to_ship';
```

```text
type: ALL, key: NULL, rows: 800000
```

This UPDATE scans 800,000 rows while holding locks.

```sql
CREATE INDEX idx_status ON orders(status);

EXPLAIN UPDATE orders SET shipped_at = NOW() WHERE status = 'ready_to_ship';
-- type: ref, key: idx_status, rows: 450
```

## Batch Large Updates

Updating millions of rows in a single statement holds locks for a long time and generates enormous redo log entries. Break large updates into smaller batches:

```sql
-- Instead of one massive update:
UPDATE audit_logs SET archived = 1 WHERE created_at < '2024-01-01';

-- Use batched updates with a loop:
UPDATE audit_logs SET archived = 1
WHERE created_at < '2024-01-01' AND archived = 0
LIMIT 1000;
-- Run this repeatedly until 0 rows affected
```

In application code:

```python
while True:
    cursor.execute("""
        UPDATE audit_logs SET archived = 1
        WHERE created_at < '2024-01-01' AND archived = 0
        LIMIT 1000
    """)
    connection.commit()  # Commit each batch to release locks
    if cursor.rowcount == 0:
        break
    time.sleep(0.01)  # Brief pause to reduce lock pressure
```

## Minimize Secondary Index Updates

Every secondary index that includes the updated column must also be updated:

```sql
-- Updating a column with many indexes is expensive
-- Check indexes on the table
SHOW INDEX FROM orders;

-- If updating a rarely-queried column, consider removing its index
-- before bulk updates and re-adding it after
```

## Multi-Table UPDATE

```sql
-- Updating one table based on values in another
EXPLAIN UPDATE orders o
JOIN customers c ON o.customer_id = c.id
SET o.region = c.region
WHERE c.country = 'US' AND o.region IS NULL;
```

Ensure both join columns are indexed:

```sql
-- Indexes needed for this join
CREATE INDEX idx_country ON customers(country);
-- orders.customer_id should already have an index (foreign key)
```

## Use WHERE to Limit Scope

Always narrow the UPDATE scope as much as possible:

```sql
-- Bad: updates potentially many rows
UPDATE products SET last_reviewed = NOW() WHERE category_id = 5;

-- Better: add additional filter to reduce lock scope
UPDATE products SET last_reviewed = NOW()
WHERE category_id = 5
AND (last_reviewed IS NULL OR last_reviewed < DATE_SUB(NOW(), INTERVAL 30 DAY));
```

## Avoid Updating the Primary Key or Indexed Columns Unnecessarily

Updating an indexed column is more expensive than updating an unindexed column because the index must be reorganized:

```sql
-- Expensive: forces index reorganization
UPDATE users SET email = 'newemail@example.com' WHERE id = 42;
-- (email is indexed for lookups, so the index must be updated too)

-- Consider: does email really need to be updated here?
-- Batch email updates at lower frequency if possible
```

## Check for Lock Contention

```sql
-- Monitor lock waits during heavy UPDATE workloads
SHOW ENGINE INNODB STATUS\G
-- Look for "TRANSACTIONS" section and lock wait information

-- Check current lock waits
SELECT * FROM information_schema.innodb_trx WHERE trx_rows_locked > 0;
```

## Summary

UPDATE performance optimization in MySQL starts with EXPLAIN to confirm the WHERE clause uses an index. For bulk updates, batch the operation into small chunks to reduce lock hold time and redo log pressure. Minimize the number of secondary indexes on frequently updated columns. Use multi-table UPDATE with proper join indexes, and always narrow the scope with additional WHERE conditions to touch as few rows as necessary.
