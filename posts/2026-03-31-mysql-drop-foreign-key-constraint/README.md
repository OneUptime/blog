# How to Drop a Foreign Key Constraint in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, Foreign Key, SQL, Schema

Description: Learn how to find and drop foreign key constraints in MySQL using ALTER TABLE, including how to handle the related index that MySQL creates automatically.

---

## Foreign Keys in MySQL

A foreign key constraint in MySQL enforces referential integrity between two tables - for example, ensuring that every `order.customer_id` value exists in the `customers.customer_id` column. When a foreign key is no longer needed, or when you need to restructure the schema, you must explicitly drop it.

## Finding the Foreign Key Name

Before you can drop a foreign key, you need its constraint name. If you did not name it explicitly when creating it, MySQL assigned an automatic name.

**Using SHOW CREATE TABLE:**

```sql
SHOW CREATE TABLE orders\G
```

Look for lines like:

```text
CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`)
REFERENCES `customers` (`customer_id`) ON DELETE CASCADE
```

**Using INFORMATION_SCHEMA:**

```sql
SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'orders'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Basic Syntax

```sql
ALTER TABLE table_name DROP FOREIGN KEY constraint_name;
```

## Example

```sql
CREATE TABLE customers (
  customer_id INT PRIMARY KEY,
  name        VARCHAR(100)
);

CREATE TABLE orders (
  order_id    INT PRIMARY KEY,
  customer_id INT NOT NULL,
  total       DECIMAL(10, 2),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

-- Drop the foreign key constraint
ALTER TABLE orders DROP FOREIGN KEY fk_orders_customer;
```

## The Associated Index Remains

An important detail: dropping a foreign key does **not** automatically drop the index MySQL created to support it. After dropping the foreign key, the index `fk_orders_customer` still exists on `orders.customer_id`.

Check remaining indexes:

```sql
SHOW INDEX FROM orders;
```

To drop the index separately:

```sql
ALTER TABLE orders DROP INDEX fk_orders_customer;
```

Or drop both in one statement:

```sql
ALTER TABLE orders
  DROP FOREIGN KEY fk_orders_customer,
  DROP INDEX fk_orders_customer;
```

## Temporarily Disabling Foreign Key Checks

If you need to drop or truncate multiple related tables without a specific order, temporarily disable the foreign key check:

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables or truncate them here
TRUNCATE TABLE orders;
TRUNCATE TABLE customers;

SET FOREIGN_KEY_CHECKS = 1;
```

Use this sparingly and always re-enable it immediately. It bypasses all referential integrity for the session.

## Dropping Foreign Keys During Schema Migrations

A common migration pattern when restructuring a relationship:

```sql
-- 1. Drop the old FK
ALTER TABLE orders DROP FOREIGN KEY fk_orders_customer;

-- 2. Modify both the referenced and referencing columns to the new type
ALTER TABLE customers MODIFY customer_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE orders MODIFY customer_id BIGINT UNSIGNED NOT NULL;

-- 3. Add the new FK pointing to the updated columns
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON DELETE CASCADE ON UPDATE CASCADE;
```

## Listing All Foreign Keys in a Database

```sql
SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;
```

## Summary

Dropping a foreign key in MySQL requires knowing the constraint name, which you can find using `SHOW CREATE TABLE` or `INFORMATION_SCHEMA`. Use `ALTER TABLE ... DROP FOREIGN KEY` to remove the constraint. Remember that the supporting index remains and must be dropped separately if no longer needed. Combine `DROP FOREIGN KEY` and `DROP INDEX` in a single `ALTER TABLE` to minimize table rebuilds.
