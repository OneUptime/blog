# How to Drop a Primary Key in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, Primary Key, SQL, Schema

Description: Learn how to drop a primary key from a MySQL table using ALTER TABLE, handle AUTO_INCREMENT columns, and re-add a new primary key safely.

---

## When Would You Drop a Primary Key?

Dropping a primary key is less common than adding one, but there are legitimate reasons:

- Replacing a surrogate key with a composite natural key
- Changing an `AUTO_INCREMENT` column to a regular integer
- Correcting a mistake in the original table design
- Temporarily removing a constraint during a bulk data migration

## Basic Syntax

```sql
ALTER TABLE table_name DROP PRIMARY KEY;
```

Unlike named indexes, a primary key is always called `PRIMARY` in MySQL, so you do not need to specify a name.

## Example: Drop Primary Key from a Simple Table

```sql
CREATE TABLE products (
  product_id INT PRIMARY KEY,
  sku        VARCHAR(50) NOT NULL,
  name       VARCHAR(100)
);

ALTER TABLE products DROP PRIMARY KEY;
```

After executing this, `products` has no primary key. The `product_id` column remains, but it is no longer the primary key.

## Handling AUTO_INCREMENT Columns

MySQL enforces a rule: a column declared as `AUTO_INCREMENT` must be a key (not necessarily the primary key, but it must be indexed). If you try to drop the primary key from a table where the primary key column has `AUTO_INCREMENT`, you will get an error:

```text
ERROR 1075 (42000): Incorrect table definition; there can be only one auto column and it must be defined as a key
```

To work around this, modify the column to remove `AUTO_INCREMENT` first:

```sql
-- Step 1: Remove AUTO_INCREMENT
ALTER TABLE products MODIFY product_id INT NOT NULL;

-- Step 2: Drop the primary key
ALTER TABLE products DROP PRIMARY KEY;
```

Or do both in one statement:

```sql
ALTER TABLE products
  MODIFY product_id INT NOT NULL,
  DROP PRIMARY KEY;
```

## Replacing the Primary Key

A common workflow is to drop the current primary key and add a new one in the same `ALTER TABLE` statement:

```sql
-- Replace a single-column PK with a composite PK
ALTER TABLE order_items
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (order_id, product_id);
```

Combining the `DROP` and `ADD` in a single statement minimizes the number of table rebuilds.

## Checking Whether a Primary Key Exists

Before dropping, you can verify the current primary key:

```sql
SHOW KEYS FROM products WHERE Key_name = 'PRIMARY';
```

Or query the information schema:

```sql
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'products'
  AND CONSTRAINT_NAME = 'PRIMARY';
```

## Impact on Foreign Keys

If another table has a foreign key that references the primary key you want to drop, MySQL will refuse:

```text
ERROR 1025 (HY000): Error on rename of ... (errno: 150 - Foreign key constraint is incorrectly formed)
```

You must drop the foreign key constraint first:

```sql
-- Drop the FK first
ALTER TABLE order_items DROP FOREIGN KEY fk_product_id;

-- Now drop the primary key
ALTER TABLE products
  MODIFY product_id INT NOT NULL,
  DROP PRIMARY KEY;
```

## Performance Considerations

Dropping or adding a primary key on an InnoDB table causes a full table rebuild because InnoDB organizes data physically around the primary key (clustered index). On large tables:

- Schedule during a maintenance window
- Consider using `pt-online-schema-change` or `gh-ost` for zero-downtime changes
- Take a backup before making structural changes

## Summary

Dropping a primary key in MySQL uses `ALTER TABLE ... DROP PRIMARY KEY`. The main gotcha is `AUTO_INCREMENT` - you must remove it from the column before dropping the primary key. Always check for foreign key references first and plan for a full table rebuild on InnoDB. Combine the `DROP PRIMARY KEY` and `ADD PRIMARY KEY` in one `ALTER TABLE` statement to minimize overhead.
