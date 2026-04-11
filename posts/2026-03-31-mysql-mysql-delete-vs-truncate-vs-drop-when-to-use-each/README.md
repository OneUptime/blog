# MySQL DELETE vs TRUNCATE vs DROP: When to Use Each

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Delete, TRUNCATE, DROP, SQL, DML, DDL

Description: Learn the differences between MySQL DELETE, TRUNCATE, and DROP and when to use each command based on your data removal needs.

---

## Overview

MySQL provides three commands for removing data: `DELETE`, `TRUNCATE`, and `DROP`. Each operates at a different level and has different implications for transactions, performance, and recoverability. Using the wrong one can be a costly mistake.

## DELETE

`DELETE` is a DML (Data Manipulation Language) statement that removes specific rows from a table based on a `WHERE` clause. It is fully transactional and fires triggers.

```sql
-- Delete a specific row
DELETE FROM orders WHERE id = 42;

-- Delete rows matching a condition
DELETE FROM orders WHERE status = 'cancelled' AND created_at < '2025-01-01';

-- Delete all rows (slow - row by row)
DELETE FROM orders;
```

Key characteristics:
- Transactional - can be rolled back inside a transaction
- Fires `BEFORE DELETE` and `AFTER DELETE` triggers
- Generates binary log events for each deleted row
- Slow for large datasets because it processes row by row
- Does not reset AUTO_INCREMENT counters
- Can use WHERE clause to target specific rows

```sql
-- DELETE inside a transaction
BEGIN;
DELETE FROM orders WHERE customer_id = 101;
-- Check results before committing
SELECT ROW_COUNT();
ROLLBACK;  -- Or COMMIT
```

## TRUNCATE

`TRUNCATE` removes all rows from a table by dropping and recreating the table structure internally. It is a DDL statement in MySQL.

```sql
-- Remove all rows from a table
TRUNCATE TABLE orders;

-- Shorthand (TABLE keyword is optional)
TRUNCATE orders;
```

Key characteristics:
- Cannot be used with a WHERE clause
- Not transactional in MySQL (cannot be rolled back once executed)
- Does not fire DML triggers
- Much faster than `DELETE` for large tables - it deallocates data pages rather than removing rows one by one
- Resets AUTO_INCREMENT counters to the table's initial value
- Requires the `DROP` privilege

```sql
-- Check that AUTO_INCREMENT resets after TRUNCATE
CREATE TABLE test (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50));
INSERT INTO test VALUES (NULL, 'Alice'), (NULL, 'Bob');
SELECT MAX(id) FROM test;  -- Returns 2

TRUNCATE TABLE test;
INSERT INTO test VALUES (NULL, 'Charlie');
SELECT id FROM test;  -- Returns 1 (counter reset)
```

## DROP

`DROP` removes the entire table including its structure, indexes, constraints, and data. The table no longer exists after a DROP.

```sql
-- Remove the table entirely
DROP TABLE orders;

-- Avoid error if table does not exist
DROP TABLE IF EXISTS orders;

-- Drop multiple tables at once
DROP TABLE orders, order_items, order_logs;
```

Key characteristics:
- Removes the table structure, not just the data
- Cannot be rolled back
- Faster than TRUNCATE for very large tables since it just removes file pointers
- Frees disk space used by table data and indexes
- All indexes, triggers, and constraints associated with the table are removed

## Comparison Table

```text
Feature                 DELETE          TRUNCATE        DROP
---------               ------          --------        ----
Removes data            Yes             Yes             Yes
Removes structure       No              No              Yes
WHERE clause            Yes             No              No
Transactional           Yes             No              No
Fires triggers          Yes             No              No
Resets AUTO_INCREMENT   No              Yes             N/A
Speed (large tables)    Slow            Fast            Fastest
Binary log              Row events      DDL event       DDL event
```

## Practical Examples

Remove expired sessions (keeping table structure):

```sql
DELETE FROM sessions WHERE expires_at < NOW();
```

Clear a staging table before loading new data:

```sql
TRUNCATE TABLE staging_imports;
```

Remove a temporary table after use:

```sql
DROP TABLE IF EXISTS temp_migration_data;
```

## Foreign Key Considerations

`TRUNCATE` fails if the table is referenced by a foreign key in another table. You must disable foreign key checks first:

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE orders;
SET FOREIGN_KEY_CHECKS = 1;
```

`DELETE` with a WHERE clause respects foreign key constraints normally and will fail if referenced rows exist.

## Summary

Use `DELETE` when you need to remove specific rows, need transactional safety, or need triggers to fire. Use `TRUNCATE` when you need to empty an entire table quickly and do not need triggers or rollback capability. Use `DROP` when you want to permanently remove the table itself. For large batch deletes, consider chunked `DELETE` with LIMIT to avoid long-running transactions and excessive binary log growth.
