# How to Truncate a Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, DDL, TRUNCATE, Table

Description: Remove all rows from a MySQL table instantly with TRUNCATE TABLE, understand how it differs from DELETE, and handle foreign key constraints safely.

---

## How It Works

`TRUNCATE TABLE` removes all rows from a table by dropping and recreating it internally. This is much faster than `DELETE FROM table` because it does not generate individual row delete events or write to the undo log row-by-row. It also resets the `AUTO_INCREMENT` counter to 1.

```mermaid
flowchart LR
    A[TRUNCATE TABLE users] --> B[Drop and recreate\ntable storage]
    B --> C[All rows removed]
    C --> D[AUTO_INCREMENT\nreset to 1]
    D --> E[Implicit COMMIT\nin InnoDB]
```

## Syntax

```sql
TRUNCATE [TABLE] table_name;
```

## Basic Example

```sql
CREATE TABLE log_entries (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    message    TEXT         NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO log_entries (message) VALUES
    ('Server started'),
    ('User logged in'),
    ('Request processed');

SELECT COUNT(*) FROM log_entries;
```

```text
+----------+
| COUNT(*) |
+----------+
|        3 |
+----------+
```

```sql
TRUNCATE TABLE log_entries;

SELECT COUNT(*) FROM log_entries;
```

```text
+----------+
| COUNT(*) |
+----------+
|        0 |
+----------+
```

## AUTO_INCREMENT Reset

After truncation, `AUTO_INCREMENT` starts from 1 again.

```sql
INSERT INTO log_entries (message) VALUES ('First entry after truncate');
SELECT id, message FROM log_entries;
```

```text
+----+----------------------------+
| id | message                    |
+----+----------------------------+
|  1 | First entry after truncate |
+----+----------------------------+
```

With `DELETE FROM log_entries`, the `AUTO_INCREMENT` counter would continue from the last value.

## TRUNCATE vs DELETE

| Feature | TRUNCATE | DELETE |
|---|---|---|
| Speed | Very fast (drop/recreate) | Slow (row-by-row) |
| WHERE clause | Not supported | Supported |
| Triggers | Not fired | Fired for each row |
| AUTO_INCREMENT reset | Yes | No |
| Transaction rollback | Not possible in InnoDB | Possible |
| Foreign key checks | Fails if FK constraint exists | Cascade or fail per FK definition |
| Requires privilege | DROP privilege | DELETE privilege |

## TRUNCATE and Foreign Keys

If another table has a foreign key referencing the table you want to truncate, MySQL rejects the operation.

```sql
CREATE TABLE users (
    id   INT UNSIGNED PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE orders (
    id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
);

INSERT INTO users VALUES (1, 'Alice');
INSERT INTO orders (user_id) VALUES (1);

TRUNCATE TABLE users;
```

```text
ERROR 1701 (42000): Cannot truncate a table referenced in a foreign key constraint
(`myapp`.`orders`, CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `myapp`.`users` (`id`))
```

To truncate a parent table, either truncate child tables first or disable foreign key checks temporarily.

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;
```

Or truncate child before parent:

```sql
TRUNCATE TABLE orders;
TRUNCATE TABLE users;
```

## Truncating Multiple Tables in Order

For a set of related tables, truncate in reverse dependency order (children before parents).

```sql
-- Assuming: order_items -> orders -> users
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE users;
```

## TRUNCATE Is Not Transactional in InnoDB

`TRUNCATE TABLE` causes an implicit commit in InnoDB. You cannot roll it back.

```sql
START TRANSACTION;
TRUNCATE TABLE log_entries;  -- implicit COMMIT happens here
ROLLBACK;                    -- too late; TRUNCATE already committed
```

If you need a rollback-safe empty operation, use `DELETE FROM table` inside a transaction.

```sql
START TRANSACTION;
DELETE FROM log_entries;
-- Can ROLLBACK here
ROLLBACK;
```

## Resetting a Table in a Development Environment

A common pattern in development is to reset tables for fresh test data.

```sql
-- Reset all test data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE products;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;
```

## Permissions Required

`TRUNCATE TABLE` requires the `DROP` privilege on the table, not just `DELETE`.

```sql
GRANT DROP ON myapp.log_entries TO 'appuser'@'localhost';
```

## Best Practices

- Use `TRUNCATE` for bulk-deleting all rows when you do not need per-row triggers or WHERE filtering.
- Always handle foreign key dependencies - either truncate children first or temporarily disable FK checks.
- Be aware that `TRUNCATE` cannot be rolled back in InnoDB.
- Do not grant `DROP` to application users; reserve `TRUNCATE` for administrative scripts.
- Prefer `DELETE FROM table WHERE ...` over `TRUNCATE` when you want to keep some rows or need the operation to be transactional.

## Summary

`TRUNCATE TABLE` removes all rows from a table instantly by internally dropping and recreating it. It is significantly faster than a full-table `DELETE`, resets the `AUTO_INCREMENT` counter, and does not fire row-level triggers. The trade-off is that it cannot be rolled back, does not support `WHERE` filtering, and fails when child tables have foreign keys referencing the truncated table. Use it for log tables, test data resets, and any scenario where clearing all rows quickly is the goal.
