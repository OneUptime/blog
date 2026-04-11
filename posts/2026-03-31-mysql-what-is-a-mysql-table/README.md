# What Is a MySQL Table

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Table, Schema

Description: Learn what a MySQL table is, how to create and modify tables, understand column types and constraints, and follow best practices for table design.

---

A MySQL table is the fundamental storage object in a relational database. It organizes data into rows and columns, where each column has a defined data type and each row represents one record. Tables are the primary way MySQL stores and retrieves application data.

## Creating a Table

The `CREATE TABLE` statement defines the table name, columns, data types, and constraints.

```sql
CREATE TABLE users (
  id         INT           AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255)  NOT NULL UNIQUE,
  name       VARCHAR(100)  NOT NULL,
  created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  active     TINYINT(1)    NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Key elements:
- `AUTO_INCREMENT` generates a unique integer for each new row
- `PRIMARY KEY` uniquely identifies each row
- `NOT NULL` prevents NULL values
- `UNIQUE` enforces uniqueness for a column
- `DEFAULT` provides a value when none is supplied

## Viewing Table Structure

```sql
-- Describe the table's columns
DESCRIBE users;
-- or
SHOW COLUMNS FROM users;

-- View the full CREATE TABLE statement
SHOW CREATE TABLE users\G
```

## Inserting and Querying Data

```sql
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice');

SELECT id, email, name, created_at
FROM users
WHERE active = 1
ORDER BY created_at DESC
LIMIT 10;
```

## Modifying a Table

```sql
-- Add a column
ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER name;

-- Modify a column definition
ALTER TABLE users MODIFY COLUMN name VARCHAR(150) NOT NULL;

-- Rename a column (MySQL 8.0+)
ALTER TABLE users RENAME COLUMN phone TO phone_number;

-- Drop a column
ALTER TABLE users DROP COLUMN phone_number;

-- Add an index
ALTER TABLE users ADD INDEX idx_name (name);
```

For large production tables, use `pt-online-schema-change` or `gh-ost` to apply ALTER TABLE without locking.

## Table Constraints

```sql
CREATE TABLE orders (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  status      ENUM('pending', 'paid', 'shipped', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;
```

## Viewing Table Metadata

```sql
-- Show table size and row count
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
  ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY DATA_LENGTH DESC;
```

## Copying and Truncating Tables

```sql
-- Copy table structure only (no data)
CREATE TABLE users_backup LIKE users;

-- Copy column definitions and data (indexes and constraints are not copied)
CREATE TABLE users_backup AS SELECT * FROM users;

-- Remove all rows (fast, resets AUTO_INCREMENT)
TRUNCATE TABLE users;

-- Remove table entirely
DROP TABLE users;
DROP TABLE IF EXISTS users;
```

## Temporary Tables

```sql
-- Create a session-scoped temporary table
CREATE TEMPORARY TABLE temp_report AS
SELECT user_id, SUM(total) AS lifetime_value
FROM orders
GROUP BY user_id;

SELECT * FROM temp_report WHERE lifetime_value > 500;
-- Automatically dropped when session ends
```

## Summary

A MySQL table stores data as typed rows and columns with enforced constraints. Use `CREATE TABLE` to define structure, `ALTER TABLE` to modify it, and `information_schema` to query metadata. Always specify a `PRIMARY KEY`, use `InnoDB` as the storage engine, and set `utf8mb4` charset for full Unicode support. For production schema changes on large tables, use online schema change tools to avoid downtime.
