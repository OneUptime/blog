# What Is an AUTO_INCREMENT Column in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, AUTO_INCREMENT, Primary Key, Schema Design, InnoDB

Description: An AUTO_INCREMENT column in MySQL automatically generates a unique sequential integer value for each new row, commonly used as a surrogate primary key.

---

## Overview

The `AUTO_INCREMENT` attribute in MySQL automatically assigns incrementing integer values to a column when new rows are inserted. It is most commonly used for primary keys, eliminating the need for applications to generate unique identifiers manually.

## Basic Usage

```sql
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert without specifying id
INSERT INTO users (username, email) VALUES ('alice', 'alice@example.com');
INSERT INTO users (username, email) VALUES ('bob', 'bob@example.com');

SELECT * FROM users;
```

```text
+----+----------+-------------------+---------------------+
| id | username | email             | created_at          |
+----+----------+-------------------+---------------------+
|  1 | alice    | alice@example.com | 2026-03-31 10:00:00 |
|  2 | bob      | bob@example.com   | 2026-03-31 10:01:00 |
+----+----------+-------------------+---------------------+
```

## Getting the Last Inserted ID

After an insert, use `LAST_INSERT_ID()` to retrieve the auto-generated value:

```sql
INSERT INTO users (username, email) VALUES ('carol', 'carol@example.com');
SELECT LAST_INSERT_ID();
```

```text
+-----------------+
| LAST_INSERT_ID()|
+-----------------+
|               3 |
+-----------------+
```

This is connection-scoped - each connection gets its own `LAST_INSERT_ID()` value.

## Checking and Setting the Current Counter

```sql
-- View the current AUTO_INCREMENT value for a table
SELECT AUTO_INCREMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'users';

-- Or from SHOW TABLE STATUS
SHOW TABLE STATUS LIKE 'users'\G
```

You can reset or jump the counter:

```sql
-- Set the next AUTO_INCREMENT value
ALTER TABLE users AUTO_INCREMENT = 1000;

-- Next insert will get id = 1000
INSERT INTO users (username, email) VALUES ('dave', 'dave@example.com');
```

## InnoDB AUTO_INCREMENT Locking (MySQL 8)

MySQL 8 defaults to `innodb_autoinc_lock_mode = 2` (interleaved mode), which provides the best concurrency for bulk inserts:

```sql
SHOW VARIABLES LIKE 'innodb_autoinc_lock_mode';
```

```text
+--------------------------+-------+
| Variable_name            | Value |
+--------------------------+-------+
| innodb_autoinc_lock_mode | 2     |
+--------------------------+-------+
```

| Mode | Value | Description |
|------|-------|-------------|
| Traditional | 0 | Table-level lock for all inserts |
| Consecutive | 1 | Light lock; gaps possible for bulk inserts |
| Interleaved | 2 | No table lock; best for concurrency |

## Gap Behavior

AUTO_INCREMENT values are never reused, even after deletes or rollbacks:

```sql
-- After deleting a row, the counter does NOT reset
DELETE FROM users WHERE id = 3;

-- Next insert gets id = 4, not 3
INSERT INTO users (username, email) VALUES ('eve', 'eve@example.com');

SELECT id, username FROM users;
```

```text
+----+----------+
| id | username |
+----+----------+
|  1 | alice    |
|  2 | bob      |
|  4 | eve      |
+----+----------+
```

## Using BIGINT for Large Tables

For high-volume tables, use `BIGINT UNSIGNED` to avoid overflow:

```sql
CREATE TABLE events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    payload JSON,
    occurred_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
);
```

`INT UNSIGNED` maxes out at ~4.3 billion rows. `BIGINT UNSIGNED` supports up to ~18.4 quintillion.

## Multiple Tables with Sequence Control

When you need application-controlled sequences that span tables, combine AUTO_INCREMENT with a separate sequence table:

```sql
-- Simulate a cross-table sequence
CREATE TABLE sequence_generator (
    seq_name VARCHAR(50) PRIMARY KEY,
    current_value BIGINT UNSIGNED NOT NULL DEFAULT 0
);

INSERT INTO sequence_generator (seq_name) VALUES ('order_id');

-- Get next value atomically
UPDATE sequence_generator
SET current_value = LAST_INSERT_ID(current_value + 1)
WHERE seq_name = 'order_id';

SELECT LAST_INSERT_ID();
```

## Resetting AUTO_INCREMENT on Table Truncate

`TRUNCATE TABLE` resets the AUTO_INCREMENT counter to 1:

```sql
TRUNCATE TABLE users;
-- AUTO_INCREMENT counter is now reset to 1
```

`DELETE FROM users` does not reset the counter.

## Summary

The `AUTO_INCREMENT` attribute is the standard way to generate surrogate primary keys in MySQL. It automatically produces unique, sequential integers and never reuses values, even after deletions or rollbacks. For production tables, prefer `BIGINT UNSIGNED AUTO_INCREMENT` to future-proof against overflow, and use `LAST_INSERT_ID()` to safely retrieve generated IDs after inserts.
