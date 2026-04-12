# How to Copy a Table Structure with CREATE TABLE LIKE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, DDL, CREATE TABLE, Schema

Description: Copy a MySQL table's structure including indexes and constraints using CREATE TABLE LIKE, without copying any row data.

---

## How It Works

`CREATE TABLE ... LIKE` creates a new empty table with the exact same column definitions, indexes, and AUTO_INCREMENT attribute as the source table. It does not copy data, views, triggers, or foreign key constraints (FK definitions are not copied).

```mermaid
flowchart LR
    A[CREATE TABLE new LIKE old] --> B[Copy column definitions]
    B --> C[Copy indexes\nPK, UNIQUE, regular]
    C --> D[Copy AUTO_INCREMENT attribute]
    D --> E[Foreign keys NOT copied]
    E --> F[New empty table ready]
```

## Syntax

```sql
CREATE TABLE new_table LIKE source_table;
```

Both tables must be in the same database, or you can qualify the source with a database prefix.

```sql
CREATE TABLE myapp.orders_backup LIKE myapp.orders;
```

## Basic Example

```sql
-- Source table
CREATE TABLE users (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    email      VARCHAR(255) NOT NULL UNIQUE,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_created_at (created_at)
);

INSERT INTO users (username, email) VALUES
    ('alice', 'alice@example.com'),
    ('bob',   'bob@example.com');

-- Create an empty copy with the same structure
CREATE TABLE users_backup LIKE users;

-- Check the new table structure
SHOW CREATE TABLE users_backup\G
```

```text
CREATE TABLE `users_backup` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
```

The indexes are copied but the table is empty.

```sql
SELECT COUNT(*) FROM users_backup;
```

```text
+----------+
| COUNT(*) |
+----------+
|        0 |
+----------+
```

## Copying Structure Across Databases

```sql
CREATE TABLE archive_db.users LIKE myapp.users;
```

This is useful for setting up archive or staging databases with the same schema as production.

## Temporary Tables

You can create a temporary table copy.

```sql
CREATE TEMPORARY TABLE temp_orders LIKE orders;
```

The temporary table exists only for the current session and is dropped automatically when the session ends.

## Limitations

Foreign key constraints are not copied:

```sql
CREATE TABLE orders (
    id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE orders_copy LIKE orders;

-- Verify FK is absent in the copy
SHOW CREATE TABLE orders_copy\G
```

```text
CREATE TABLE `orders_copy` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_orders_user` (`user_id`)
) ENGINE=InnoDB ...
-- Index on user_id is copied, but CONSTRAINT fk_orders_user is NOT
```

To add the FK to the copy:

```sql
ALTER TABLE orders_copy
    ADD CONSTRAINT fk_orders_copy_user
        FOREIGN KEY (user_id) REFERENCES users (id);
```

## Combining LIKE with INSERT INTO SELECT

To create a structural copy and then populate it with data from the source:

```sql
-- Step 1: Copy the structure
CREATE TABLE orders_2023 LIKE orders;

-- Step 2: Copy only 2023 data
INSERT INTO orders_2023
    SELECT * FROM orders
    WHERE YEAR(created_at) = 2023;

SELECT COUNT(*) FROM orders_2023;
```

## Creating a Staging Table Pattern

A common pattern is to pre-populate a shadow table and then atomically swap it with the live table.

```sql
-- Create a staging table with the same structure
CREATE TABLE users_new LIKE users;

-- Populate the staging table (with new schema migrations if needed)
ALTER TABLE users_new ADD COLUMN phone VARCHAR(20);
INSERT INTO users_new (id, username, email, is_active, created_at)
    SELECT id, username, email, is_active, created_at FROM users;

-- Atomically swap the tables
RENAME TABLE users TO users_old, users_new TO users;

-- Clean up
DROP TABLE users_old;
```

## Best Practices

- Use `CREATE TABLE ... LIKE` for creating archive, backup, or staging tables quickly without re-typing the schema.
- Remember that foreign keys are not copied - add them explicitly if the copy needs referential integrity.
- Combine with `INSERT INTO ... SELECT` immediately after for a full structural and data copy.
- Use `CREATE TEMPORARY TABLE ... LIKE` for intermediate working tables in stored procedures.

## Summary

`CREATE TABLE new LIKE source` creates an empty table with the same column definitions, indexes, and AUTO_INCREMENT value as the source table. It is the fastest way to create a structurally identical copy. Foreign key constraints are not copied and must be added separately. Combine it with `INSERT INTO ... SELECT` to copy both structure and data, or use `RENAME TABLE` for zero-downtime schema swap patterns.
