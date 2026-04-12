# How to Use TRUNCATE TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, TRUNCATE TABLE, DDL, Data Management, Performance

Description: Learn how to use TRUNCATE TABLE in MySQL to quickly delete all rows from a table, reset AUTO_INCREMENT, and understand how it differs from DELETE.

---

## What Is TRUNCATE TABLE?

`TRUNCATE TABLE` removes all rows from a table quickly by dropping and re-creating the table internally. Unlike `DELETE`, it does not log individual row deletions, making it much faster for clearing large tables. It also resets the `AUTO_INCREMENT` counter to its starting value.

```sql
-- Remove all rows from a table quickly
TRUNCATE TABLE session_tokens;
```

## Basic Syntax

```sql
-- Standard syntax
TRUNCATE TABLE logs;

-- TABLE keyword is optional
TRUNCATE logs;
```

## TRUNCATE vs DELETE

The key differences between TRUNCATE and DELETE:

```sql
-- DELETE: DML operation, can have WHERE clause, logs each row, rollback is possible
DELETE FROM audit_logs;               -- Slow for large tables
DELETE FROM audit_logs WHERE id > 100; -- Can filter rows

-- TRUNCATE: DDL operation, no WHERE clause, much faster, resets AUTO_INCREMENT
TRUNCATE TABLE audit_logs;            -- Very fast
-- TRUNCATE TABLE audit_logs WHERE id > 100;  -- NOT allowed!
```

Comparison table:

```text
Feature                | TRUNCATE         | DELETE
-----------------------|------------------|------------------
Speed (large tables)   | Very fast        | Slow
WHERE clause           | Not supported    | Supported
Logging                | Minimal (DDL)    | Row-by-row
AUTO_INCREMENT reset   | Yes              | No
Rollback               | Cannot rollback  | Can rollback in transaction
Triggers fired         | No               | Yes
Foreign key checks     | Blocked if refs  | Can use cascade
```

## TRUNCATE and AUTO_INCREMENT

TRUNCATE resets the AUTO_INCREMENT counter:

```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50)
);

INSERT INTO orders (product) VALUES ('Widget'), ('Gadget'), ('Gizmo');
-- ids: 1, 2, 3

TRUNCATE TABLE orders;
-- Table is now empty, AUTO_INCREMENT reset to 1

INSERT INTO orders (product) VALUES ('New Widget');
-- id = 1 again
```

## TRUNCATE and Foreign Keys

TRUNCATE cannot be used on tables that are referenced by foreign keys from other tables (unless those constraints are disabled):

```sql
-- This will fail if another table has a FK referencing 'categories'
TRUNCATE TABLE categories;
-- ERROR 1701: Cannot truncate a table referenced in a foreign key constraint

-- Workaround: temporarily disable FK checks
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE categories;
SET FOREIGN_KEY_CHECKS = 1;

-- Note: truncating child tables first does NOT help.
-- MySQL blocks TRUNCATE if a FK constraint exists, even if no rows reference the table.
-- You must disable FK checks or drop the constraint to truncate the parent table.
```

## TRUNCATE and Transactions

TRUNCATE is a DDL operation and causes an implicit COMMIT:

```sql
-- TRUNCATE cannot be rolled back
START TRANSACTION;
TRUNCATE TABLE temp_data;
ROLLBACK;  -- This does NOT undo the TRUNCATE

-- DELETE can be rolled back
START TRANSACTION;
DELETE FROM temp_data;
ROLLBACK;  -- Data is restored
```

## Practical Use Cases

```sql
-- Clear a staging table before loading new data
TRUNCATE TABLE staging_imports;
LOAD DATA INFILE '/var/lib/mysql-files/new_data.csv'
INTO TABLE staging_imports ...;

-- Reset a session/cache table at application start
TRUNCATE TABLE user_sessions;

-- Clear test data in development without dropping/recreating the table
TRUNCATE TABLE test_orders;
TRUNCATE TABLE test_customers;

-- Reset a metrics table for a new reporting period
TRUNCATE TABLE monthly_metrics;
```

## TRUNCATE in Stored Procedures

```sql
DELIMITER //
CREATE PROCEDURE refresh_staging_data()
BEGIN
    TRUNCATE TABLE staging_products;

    INSERT INTO staging_products
    SELECT * FROM products WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);

    SELECT ROW_COUNT() AS rows_loaded;
END //
DELIMITER ;
```

## Summary

`TRUNCATE TABLE` is the fastest way to delete all rows from a MySQL table. It resets the `AUTO_INCREMENT` counter, requires no transaction logging per row, and is orders of magnitude faster than `DELETE` for large tables. However, it cannot be rolled back (implicit commit), does not fire `DELETE` triggers, and cannot be used on tables with active foreign key references. Use it for clearing staging tables, resetting test data, and flushing cache tables.
