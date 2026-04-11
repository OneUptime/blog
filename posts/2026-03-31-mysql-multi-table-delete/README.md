# How to Use Multi-Table DELETE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Delete, Multi-Table, Join, DML

Description: Learn MySQL's multi-table DELETE syntax to delete rows from one or more tables simultaneously using JOIN conditions across related tables.

---

## What Is Multi-Table DELETE

MySQL's multi-table `DELETE` extends the standard single-table form to allow filtering through - and deleting from - multiple tables in one statement. This is more efficient than running several separate `DELETE` statements inside a transaction when you need to clean up related data.

## Two Syntax Forms

**Form 1 - DELETE ... FROM:**

```sql
DELETE t1, t2
FROM t1
INNER JOIN t2 ON t1.id = t2.t1_id
WHERE t1.status = 'expired';
```

Target tables to delete from are listed between `DELETE` and `FROM`. The `FROM` clause contains the full table references with joins.

**Form 2 - DELETE FROM ... USING:**

```sql
DELETE FROM t1, t2
USING t1
INNER JOIN t2 ON t1.id = t2.t1_id
WHERE t1.status = 'expired';
```

Target tables are listed between `DELETE FROM` and `USING`. The `USING` clause contains the full table references with joins. Both forms are equivalent and produce the same result.

Only rows from tables named as targets are removed. Tables used only for filtering appear in the join clauses but are not modified.

## Deleting from One Table Using Another as a Filter

Delete orders that belong to deactivated customers:

```sql
DELETE o
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
WHERE c.active = 0;
```

Only rows in `orders` are deleted. The `customers` table is used only as a filter.

## Deleting from Both Tables Simultaneously

Remove orders and their line items together:

```sql
DELETE o, oi
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'cancelled'
  AND o.created_at < '2025-01-01';
```

Both `orders` and `order_items` rows matching the condition are deleted atomically.

## Using LEFT JOIN to Remove Orphaned Rows

Delete comments whose parent post has been removed:

```sql
DELETE c
FROM comments c
LEFT JOIN posts p ON c.post_id = p.id
WHERE p.id IS NULL;
```

Rows in `comments` that have no matching `posts` row are removed.

## Joining Three Tables for Precise Filtering

```sql
DELETE oi
FROM order_items oi
INNER JOIN orders o    ON oi.order_id    = o.id
INNER JOIN customers c ON o.customer_id = c.id
WHERE c.region = 'EU'
  AND o.created_at < '2024-01-01';
```

Three tables participate in the join, but only `order_items` rows are deleted.

## Previewing with a Matching SELECT

Before executing the `DELETE`, run the equivalent `SELECT`:

```sql
SELECT o.id, oi.id AS item_id
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'cancelled'
  AND o.created_at < '2025-01-01';
```

Confirm the row count matches expectations, then replace the `SELECT` clause with `DELETE o, oi`.

## Restrictions

- `LIMIT` and `ORDER BY` are not supported in multi-table `DELETE`.
- Aliases must be consistent throughout the statement.
- You cannot reference the same table being deleted from in a subquery within the same statement.

To work around the `LIMIT` restriction, identify target IDs first:

```sql
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM (
    SELECT id FROM orders WHERE status = 'cancelled' LIMIT 1000
  ) AS sub
);
```

## Summary

MySQL's multi-table `DELETE` syntax provides a clean, atomic way to delete rows from one or more tables using JOIN-based filtering. Use it to clean up parent and child records together, remove orphaned rows with `LEFT JOIN`, and filter deletes through related tables without running multiple separate statements.
