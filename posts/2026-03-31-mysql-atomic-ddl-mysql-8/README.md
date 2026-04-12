# How to Use Atomic DDL in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, Transaction, Atomicity, Database

Description: Learn how Atomic DDL in MySQL 8 ensures schema changes are fully committed or fully rolled back, preventing partial failures.

---

## What Is Atomic DDL?

Prior to MySQL 8.0, DDL statements like `DROP TABLE` or `CREATE TABLE` were not transactional. If the server crashed mid-way, you could end up with partially applied schema changes that left the database in an inconsistent state.

MySQL 8.0 introduced Atomic DDL, which binds DDL operations to the data dictionary stored in InnoDB. This means DDL statements are now either fully committed or fully rolled back - there is no partial state.

## How Atomic DDL Works

MySQL 8.0 stores all metadata in a transactional InnoDB-based data dictionary instead of the old `.frm` file system. When you run a DDL statement, MySQL writes changes to the data dictionary inside a transaction. If something goes wrong, the entire change is rolled back automatically.

```sql
-- In MySQL 5.7, this could leave partial state on crash
-- e.g., t1 dropped but t2 and t3 remain if the server crashes mid-way
DROP TABLE t1, t2, t3;

-- With Atomic DDL (MySQL 8.0), the same statement is all-or-nothing
-- If t3 does not exist, no tables are dropped and an error is returned
DROP TABLE t1, t2, t3;

-- Use IF EXISTS to drop only the tables that exist without raising an error
DROP TABLE IF EXISTS t1, t2, t3;
```

## Practical Example: Safe Multi-Table Drop

```sql
-- Create test tables
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    total DECIMAL(10,2)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    qty INT
);

-- Atomically drop both tables
-- Either both drop or neither drops
DROP TABLE orders, order_items;
```

## Handling Errors Gracefully

With Atomic DDL, if any part of a multi-object DDL fails, the entire operation rolls back:

```sql
-- This will fail if nonexistent_table does not exist
-- With Atomic DDL, orders and order_items are NOT dropped
DROP TABLE orders, order_items, nonexistent_table;
-- ERROR 1051 (42S02): Unknown table 'mydb.nonexistent_table'

-- Use IF EXISTS to avoid errors on missing objects
DROP TABLE IF EXISTS orders, order_items, nonexistent_table;
-- Drops orders and order_items, silently skips nonexistent_table
```

## CREATE OR REPLACE and Atomicity

The `CREATE OR REPLACE VIEW` syntax, available since earlier MySQL versions, is now atomic in MySQL 8.0:

```sql
CREATE OR REPLACE VIEW active_orders AS
SELECT id, customer_id, total
FROM orders
WHERE status = 'active';
```

This replaces the old view definition in a single atomic operation. No window exists where the view is missing.

## Checking Data Dictionary Storage

You can verify that InnoDB backs the data dictionary:

```sql
-- Verify MySQL version supports Atomic DDL
SELECT VERSION();

-- Inspect data dictionary tables (requires root)
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mysql'
  AND TABLE_NAME IN ('tables', 'columns', 'indexes')
ORDER BY TABLE_NAME;
```

## Limitations

Not all storage engines benefit equally. Atomic DDL applies fully to InnoDB tables. Non-transactional engines like MyISAM do not support full atomicity for DDL. Additionally, some statements like `DROP DATABASE` are not fully atomic in all edge cases when mixing engines.

```sql
-- Check your tables use InnoDB
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_database'
  AND ENGINE != 'InnoDB';
```

## Summary

Atomic DDL in MySQL 8.0 eliminates a long-standing reliability gap. By backing the data dictionary with InnoDB transactions, schema changes are now all-or-nothing operations. This prevents partial failures from leaving databases in inconsistent states, making MySQL 8.0 significantly safer for production schema management and automated deployment pipelines.
