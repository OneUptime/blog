# How to Use INSERT IGNORE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INSERT IGNORE, Data Integrity, SQL, Duplicate Handling

Description: Learn how to use INSERT IGNORE in MySQL to silently skip rows that would cause constraint violations, enabling safe bulk inserts without interrupting on duplicates.

---

## What Is INSERT IGNORE?

`INSERT IGNORE` tells MySQL to skip rows that would cause an error due to constraint violations (such as duplicate primary keys or unique index conflicts) instead of aborting the statement. Other valid rows in the same INSERT are still processed.

```sql
-- Without IGNORE: this would fail if email already exists
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice');

-- With IGNORE: duplicate rows are silently skipped
INSERT IGNORE INTO users (email, name) VALUES ('alice@example.com', 'Alice');
```

## Basic Example

```sql
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- First insert: succeeds
INSERT IGNORE INTO tags (name) VALUES ('mysql');
INSERT IGNORE INTO tags (name) VALUES ('database');

-- Second insert of 'mysql': silently skipped (no error)
INSERT IGNORE INTO tags (name) VALUES ('mysql');

SELECT * FROM tags;
-- Returns only 2 rows: mysql, database
```

## Bulk Insert with IGNORE

`INSERT IGNORE` is especially useful for bulk imports where some rows may already exist:

```sql
-- Import a large list of emails; skip duplicates
INSERT IGNORE INTO newsletter_subscribers (email, subscribed_at)
VALUES
    ('user1@example.com', NOW()),
    ('user2@example.com', NOW()),
    ('user1@example.com', NOW()),  -- duplicate, will be skipped
    ('user3@example.com', NOW());

-- Only 3 rows inserted (user1 duplicate is ignored)
SELECT ROW_COUNT();  -- Returns 3
```

## INSERT IGNORE vs INSERT ON DUPLICATE KEY UPDATE

```sql
-- INSERT IGNORE: skips conflicting rows entirely
INSERT IGNORE INTO products (sku, price)
VALUES ('PROD001', 19.99);
-- If PROD001 exists, nothing changes - old price is kept

-- INSERT ON DUPLICATE KEY UPDATE: updates the row on conflict
INSERT INTO products (sku, price)
VALUES ('PROD001', 19.99)
ON DUPLICATE KEY UPDATE price = VALUES(price);
-- If PROD001 exists, price is updated to 19.99
```

Use `INSERT IGNORE` when you want to preserve existing data. Use `ON DUPLICATE KEY UPDATE` when you want to overwrite or update existing data.

## Effect on AUTO_INCREMENT

`INSERT IGNORE` still advances the `AUTO_INCREMENT` counter even when rows are skipped:

```sql
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    name VARCHAR(100)
);

INSERT IGNORE INTO items (code, name) VALUES ('A001', 'Widget');
-- id = 1
INSERT IGNORE INTO items (code, name) VALUES ('A001', 'Widget v2');
-- Duplicate, skipped BUT AUTO_INCREMENT advances to 2
INSERT IGNORE INTO items (code, name) VALUES ('A002', 'Gadget');
-- id = 3 (gap exists because of the skipped insert)
```

## Handling Other Errors with IGNORE

`INSERT IGNORE` suppresses all errors, not just duplicate key violations. This includes data too long, out-of-range values, and foreign key violations (in some cases):

```sql
-- Data truncation example: 'Hello World!' is truncated to fit VARCHAR(5)
INSERT IGNORE INTO narrow_table (short_col) VALUES ('Hello World!');
-- Warning generated, value truncated and inserted as 'Hello'

-- Check warnings after INSERT IGNORE
SHOW WARNINGS;
```

## Checking How Many Rows Were Actually Inserted

```sql
INSERT IGNORE INTO tags (name)
VALUES ('python'), ('java'), ('go'), ('python'), ('rust');

SELECT ROW_COUNT() AS rows_affected;
-- Returns 4 (python duplicate was skipped, 4 rows inserted)
```

## Practical Use Case - Idempotent Data Seeding

```sql
-- Safely re-run seed data script without errors
INSERT IGNORE INTO roles (name, description)
VALUES
    ('admin', 'Full system access'),
    ('editor', 'Can edit content'),
    ('viewer', 'Read-only access');
-- Running this multiple times is safe - duplicates are ignored
```

## Summary

`INSERT IGNORE` is a simple and effective way to handle duplicate key conflicts by silently discarding conflicting rows during inserts. It is ideal for bulk data imports, idempotent seed scripts, and situations where preserving existing data takes priority. Be aware that it suppresses all insert errors (not just duplicates) and still increments `AUTO_INCREMENT` counters even for skipped rows. Use `SHOW WARNINGS` to verify what was actually skipped.
