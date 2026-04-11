# How to Update Data Through a View in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, Updatable View, WITH CHECK OPTION, DML

Description: Learn which MySQL views are updatable, how to INSERT, UPDATE, and DELETE through a view, and how WITH CHECK OPTION enforces view conditions on writes.

---

MySQL views are not read-only by default. Under certain conditions you can run `INSERT`, `UPDATE`, and `DELETE` through a view, and MySQL will translate those operations to the underlying base table.

## What Makes a View Updatable

A view is updatable if MySQL can map each row in the view directly to one row in a single base table. The view must **not** contain:
- `DISTINCT`
- Aggregate functions (`SUM`, `COUNT`, `AVG`, etc.)
- `GROUP BY` or `HAVING`
- `UNION` or `UNION ALL`
- Subqueries in the `SELECT` list
- References to non-updatable views

A simple projection or filtered view is typically updatable:

```sql
CREATE VIEW active_products AS
SELECT product_id, name, price, stock, status
FROM products
WHERE status = 'active';
```

## UPDATE Through a View

```sql
UPDATE active_products
SET price = price * 1.05
WHERE stock < 10;
```

MySQL translates this to:

```sql
UPDATE products
SET price = price * 1.05
WHERE status = 'active' AND stock < 10;
```

## INSERT Through a View

```sql
INSERT INTO active_products (name, price, stock)
VALUES ('New Widget', 29.99, 100);
```

MySQL inserts the row into `products`. Base-table columns not listed in the INSERT (like `product_id` and `status`) receive their default values - if a required column has no default, the insert fails. Design views for inserts carefully and ensure all required columns either appear in the INSERT or have defaults.

## DELETE Through a View

```sql
DELETE FROM active_products WHERE stock = 0;
```

MySQL deletes the matching rows from `products`.

## WITH CHECK OPTION

Without a guard, you can `UPDATE` a row through a view in a way that makes it disappear from the view:

```sql
-- This removes the row from active_products (status becomes 'inactive')
UPDATE active_products SET status = 'inactive' WHERE product_id = 42;
```

Add `WITH CHECK OPTION` to prevent this:

```sql
CREATE OR REPLACE VIEW active_products AS
SELECT product_id, name, price, stock, status
FROM products
WHERE status = 'active'
WITH CHECK OPTION;
```

Now attempting to set `status = 'inactive'` through the view raises an error:

```text
ERROR 1369 (HY000): CHECK OPTION failed 'mydb.active_products'
```

## LOCAL vs CASCADED Check Option

When views are nested, `WITH LOCAL CHECK OPTION` only enforces the current view's `WHERE` condition. `WITH CASCADED CHECK OPTION` (the default) enforces conditions from all views in the chain:

```sql
CREATE VIEW discounted_active_products AS
SELECT * FROM active_products
WHERE price < 50
WITH CASCADED CHECK OPTION;
```

An insert through `discounted_active_products` must satisfy both `status = 'active'` AND `price < 50`.

## Checking View Updatability

```sql
SELECT TABLE_NAME, IS_UPDATABLE
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'mydb';
```

`IS_UPDATABLE = 'YES'` means the view supports `UPDATE`, `INSERT`, and `DELETE`.

## Summary

Simple MySQL views that project columns from a single base table are updatable, allowing `INSERT`, `UPDATE`, and `DELETE` to pass through to the base table. Add `WITH CHECK OPTION` to prevent writes that would make the modified row invisible from the view, and check `information_schema.VIEWS.IS_UPDATABLE` to confirm a view supports DML operations.
