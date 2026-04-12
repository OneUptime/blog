# How to Add a Foreign Key Constraint in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, Constraint, Referential Integrity

Description: Learn how to add foreign key constraints in MySQL to enforce referential integrity between tables, with ON DELETE and ON UPDATE actions.

---

## What Is a Foreign Key?

A foreign key is a column (or set of columns) in one table that references the primary key (or unique key) of another table. MySQL enforces referential integrity: you cannot insert a value into the foreign key column that does not exist in the referenced table.

## Basic Syntax

```sql
ALTER TABLE child_table
ADD CONSTRAINT constraint_name
FOREIGN KEY (child_column)
REFERENCES parent_table (parent_column)
[ON DELETE action]
[ON UPDATE action];
```

## Simple Foreign Key Example

```sql
ALTER TABLE orders
ADD CONSTRAINT fk_orders_user
FOREIGN KEY (user_id)
REFERENCES users (id);
```

`user_id` in `orders` must match an existing `id` in `users`. Inserting an `order` with a non-existent `user_id` will fail.

## Referential Actions

Control what happens when a referenced row is deleted or updated:

```text
RESTRICT    (default) - block the delete/update if child rows exist
CASCADE     - delete/update child rows automatically
SET NULL    - set the child column to NULL (column must allow NULL)
NO ACTION   - same as RESTRICT in MySQL (both check immediately)
```

Note: `SET DEFAULT` is recognized by the MySQL parser but is rejected by InnoDB. It is not usable with InnoDB tables.

```sql
ALTER TABLE orders
ADD CONSTRAINT fk_orders_user
FOREIGN KEY (user_id)
REFERENCES users (id)
ON DELETE CASCADE
ON UPDATE CASCADE;
```

## Composite Foreign Key

A foreign key can span multiple columns if the referenced key is composite:

```sql
ALTER TABLE order_item_notes
ADD CONSTRAINT fk_notes_order_item
FOREIGN KEY (order_id, product_id)
REFERENCES order_items (order_id, product_id)
ON DELETE CASCADE;
```

## Defining Foreign Keys at Table Creation

```sql
CREATE TABLE orders (
    id         INT NOT NULL AUTO_INCREMENT,
    user_id    INT NOT NULL,
    total      DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);
```

## Requirements for Adding a Foreign Key

1. Both tables must use the InnoDB storage engine.
2. The referenced column must be indexed (primary key or unique key).
3. The data types of the foreign key and referenced column must match.
4. All existing values in the child column must already exist in the parent column.

## Checking Existing Foreign Keys

```sql
SELECT
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Dropping a Foreign Key

```sql
ALTER TABLE orders
DROP FOREIGN KEY fk_orders_user;
```

Note: this does not remove the underlying index. To remove both:

```sql
ALTER TABLE orders
DROP FOREIGN KEY fk_orders_user,
DROP INDEX fk_orders_user;
```

## Temporarily Disabling Foreign Key Checks

For bulk data loading or complex migrations:

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- ... insert data ...

SET FOREIGN_KEY_CHECKS = 1;
```

Always re-enable immediately after the operation.

## Summary

Add foreign key constraints in MySQL with `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES`. Specify `ON DELETE` and `ON UPDATE` referential actions to control cascading behavior. Ensure both tables use InnoDB, that the referenced column is indexed, and that all existing child column values match the parent. Use `INFORMATION_SCHEMA.KEY_COLUMN_USAGE` to audit existing foreign key relationships.
