# How to Fix ERROR 1062 Duplicate Entry for Key in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Duplicate Entry, Unique Constraint, Troubleshooting

Description: Learn how to diagnose and fix MySQL ERROR 1062 Duplicate Entry for Key by identifying conflicts, using upsert patterns, and cleaning duplicate data.

---

`ERROR 1062 (23000): Duplicate entry 'value' for key 'table.key_name'` occurs when an INSERT or UPDATE violates a UNIQUE or PRIMARY KEY constraint.

## Understanding the Error

```text
ERROR 1062 (23000): Duplicate entry 'alice@example.com' for key 'users.uq_email'
```

- `alice@example.com` is the value that already exists
- `users.uq_email` is the constraint being violated

## Finding Which Constraint Was Violated

```sql
SHOW CREATE TABLE users\G
-- Look for UNIQUE KEY or PRIMARY KEY definitions
```

```sql
-- Check what value already exists
SELECT * FROM users WHERE email = 'alice@example.com';
```

## Fix 1 - Use INSERT IGNORE (Skip Duplicates)

```sql
INSERT IGNORE INTO users (email, name)
VALUES ('alice@example.com', 'Alice');
-- Silently skips if email already exists
```

Note: `INSERT IGNORE` also suppresses other errors. Use with caution.

## Fix 2 - Use INSERT ... ON DUPLICATE KEY UPDATE (Upsert)

```sql
INSERT INTO users (email, name, last_login)
VALUES ('alice@example.com', 'Alice', NOW()) AS new
ON DUPLICATE KEY UPDATE
    name       = new.name,
    last_login = new.last_login;
```

This inserts if no conflict, otherwise updates the specified columns.

## Fix 3 - Use REPLACE INTO

```sql
REPLACE INTO users (id, email, name)
VALUES (NULL, 'alice@example.com', 'Alice Updated');
```

`REPLACE INTO` deletes the old row and inserts a new one. This changes the auto-increment `id` and cascades deletes. Prefer `ON DUPLICATE KEY UPDATE` instead.

## Cleaning Existing Duplicate Data

Before adding a unique index to a table with existing duplicates:

```sql
-- Find duplicate emails
SELECT email, COUNT(*) AS cnt
FROM   users
GROUP BY email
HAVING cnt > 1;

-- Keep the oldest row, delete duplicates
DELETE u1 FROM users u1
INNER JOIN users u2
    ON u1.email = u2.email
    AND u1.id > u2.id;

-- Now add the unique index
ALTER TABLE users ADD UNIQUE KEY uq_email (email);
```

## Handling Duplicates in Bulk Inserts

When inserting many rows where some may conflict:

```sql
INSERT INTO products (sku, name, price)
VALUES
    ('A100', 'Widget A', 9.99),
    ('A101', 'Widget B', 14.99),
    ('A100', 'Widget A v2', 9.99)  -- duplicate sku
AS new
ON DUPLICATE KEY UPDATE
    name  = new.name,
    price = new.price;
```

## Application-Level Handling

```python
import mysql.connector

try:
    cursor.execute("INSERT INTO users (email, name) VALUES (%s, %s)", (email, name))
    conn.commit()
except mysql.connector.IntegrityError as e:
    if e.errno == 1062:
        print(f"Email {email} already registered")
        conn.rollback()
    else:
        raise
```

## Summary

ERROR 1062 signals a unique constraint violation. Use `ON DUPLICATE KEY UPDATE` for upsert behavior, `INSERT IGNORE` to silently skip duplicates, or handle it in application code with a retry or conflict response. Before adding a unique constraint to an existing table, clean duplicate rows first. Avoid `REPLACE INTO` as it deletes and reinserts, breaking foreign key references.
