# How to Use DROP INDEX Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Indexing, Database Management, DDL

Description: Learn how to use the DROP INDEX statement in MySQL to remove unused or redundant indexes and improve write performance on busy tables.

---

## What Is DROP INDEX in MySQL

The `DROP INDEX` statement removes an existing index from a MySQL table. You might drop an index to reduce write overhead on heavily updated tables, remove duplicate indexes, or clean up after schema changes. With InnoDB, dropping a secondary index is an in-place operation that does not rebuild the table. However, dropping a primary key requires a full table rebuild and can be slow on large tables.

## Basic Syntax

```sql
DROP INDEX index_name ON table_name;
```

The `ALTER TABLE` syntax also works and is equivalent:

```sql
ALTER TABLE table_name DROP INDEX index_name;
```

## Listing Existing Indexes

Before dropping an index, identify which indexes exist:

```sql
SHOW INDEX FROM orders;
```

Or query the information schema:

```sql
SELECT index_name, column_name, non_unique, seq_in_index
FROM information_schema.statistics
WHERE table_schema = 'mydb'
  AND table_name = 'orders'
ORDER BY index_name, seq_in_index;
```

## Dropping a Regular Index

```sql
-- Drop an index named idx_customer_id from the orders table
DROP INDEX idx_customer_id ON orders;
```

## Dropping a Unique Index

```sql
-- Unique indexes are dropped the same way
DROP INDEX idx_unique_email ON users;
```

Note: Dropping a UNIQUE index removes both the index and the uniqueness constraint.

## Dropping the Primary Key

The primary key index requires special handling because it cannot be dropped with `DROP INDEX` alone. Use `ALTER TABLE`:

```sql
ALTER TABLE orders DROP PRIMARY KEY;
```

If the primary key column is `AUTO_INCREMENT`, you must remove the AUTO_INCREMENT attribute first:

```sql
ALTER TABLE orders MODIFY id INT NOT NULL;
ALTER TABLE orders DROP PRIMARY KEY;
```

## Dropping Multiple Indexes at Once

Use `ALTER TABLE` to drop multiple indexes in a single DDL operation, which reduces the number of table rebuilds:

```sql
ALTER TABLE orders
    DROP INDEX idx_customer_id,
    DROP INDEX idx_status;
```

## Checking Index Usage Before Dropping

MySQL 8.0+ supports invisible indexes, allowing you to test the impact of dropping an index before actually removing it:

```sql
-- Make the index invisible first
ALTER TABLE orders ALTER INDEX idx_customer_id INVISIBLE;

-- Monitor query performance for a period, then drop if safe
DROP INDEX idx_customer_id ON orders;
```

You can also query the performance schema to see if an index is being used:

```sql
SELECT object_schema, object_name, index_name, count_star
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = 'mydb'
  AND object_name = 'orders'
  AND index_name = 'idx_customer_id';
```

If `count_star` is zero, the index has not been used since the last server restart.

## Online DDL Considerations

In MySQL 8.0 with InnoDB, dropping an index is an online operation (using `ALGORITHM=INPLACE`), meaning it does not block reads or writes during execution. However, for large tables it still takes time:

```sql
DROP INDEX idx_customer_id ON orders ALGORITHM=INPLACE LOCK=NONE;
```

If you need to avoid any locking:

```sql
ALTER TABLE orders DROP INDEX idx_old_col, ALGORITHM=INPLACE, LOCK=NONE;
```

## Common Errors

If you try to drop an index that does not exist, MySQL returns an error:

```text
ERROR 1091 (42000): Can't DROP 'idx_foo'; check that column/key exists
```

Use `IF EXISTS` (available via `ALTER TABLE`) to handle this gracefully:

```sql
ALTER TABLE orders DROP INDEX IF EXISTS idx_old_col;
```

## Summary

The `DROP INDEX` statement removes unwanted indexes from MySQL tables. Always verify which indexes exist before dropping, and consider using invisible indexes in MySQL 8.0 to test impact before committing to removal. Use `ALTER TABLE` to drop multiple indexes in a single pass and minimize table rebuild overhead.
