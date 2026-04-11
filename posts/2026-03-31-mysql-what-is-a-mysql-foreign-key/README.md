# What Is a MySQL Foreign Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Foreign Key, Constraint

Description: Learn what a MySQL foreign key is, how referential integrity works, the ON DELETE and ON UPDATE actions available, and when to use or skip foreign keys.

---

A foreign key is a constraint that enforces a relationship between two tables. It ensures that a value in one table's column must exist as a primary (or unique) key in another table. This is called referential integrity - it prevents orphaned records and data inconsistencies.

## Defining a Foreign Key

```sql
CREATE TABLE customers (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;
```

Now MySQL will reject any `INSERT` into `orders` with a `customer_id` that does not exist in `customers`.

```sql
-- This will fail with a foreign key constraint violation
INSERT INTO orders (customer_id, total) VALUES (9999, 49.99);
-- ERROR 1452: Cannot add or update a child row: a foreign key constraint fails
```

## ON DELETE and ON UPDATE Actions

You can control what happens to child rows when the parent row is deleted or updated.

```sql
CREATE TABLE orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total       DECIMAL(10,2),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;
```

Available actions:

| Action | Behavior |
|---|---|
| `RESTRICT` | Default. Block delete/update if child rows exist |
| `CASCADE` | Automatically delete/update child rows |
| `SET NULL` | Set child column to NULL when parent is deleted/updated |
| `NO ACTION` | Same as RESTRICT in MySQL |

```sql
-- SET NULL example: orders stay, but customer_id becomes NULL
CREATE TABLE orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,  -- must allow NULL for SET NULL
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;
```

## Checking Existing Foreign Keys

```sql
-- View foreign keys for a table
SELECT
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'orders'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Disabling Foreign Keys

Foreign key checks can be temporarily disabled for bulk operations like migrations or data imports.

```sql
-- Disable foreign key checks for this session
SET foreign_key_checks = 0;

-- Perform bulk operations
TRUNCATE TABLE orders;
TRUNCATE TABLE customers;

-- Re-enable
SET foreign_key_checks = 1;
```

## Adding and Dropping Foreign Keys

```sql
-- Add a foreign key to an existing table
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Drop a foreign key
ALTER TABLE orders DROP FOREIGN KEY fk_orders_customer;
```

## When to Skip Foreign Keys

In high-throughput applications or when using sharded architectures (like Vitess), teams sometimes skip foreign key enforcement in the database and implement integrity checks in the application layer instead. Foreign key checks add overhead to every INSERT, UPDATE, and DELETE.

```sql
-- Check FK overhead: look at 'rows_affected' and timing
-- In write-heavy systems, FK checks can be 5-15% overhead
SHOW STATUS LIKE 'Innodb_rows_inserted';
```

## Summary

A MySQL foreign key enforces referential integrity between tables, preventing orphaned records. Use `ON DELETE CASCADE` when child records should not exist without a parent. Use `ON DELETE SET NULL` when child records should be retained with a null reference. For write-heavy systems or distributed architectures, application-level integrity may be preferred over database-level foreign keys to reduce overhead.
