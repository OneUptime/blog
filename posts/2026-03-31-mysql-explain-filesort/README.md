# How to Identify Filesort Using EXPLAIN in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Filesort, Performance, Index

Description: Learn how to detect Using filesort in MySQL EXPLAIN output, understand what causes it, and eliminate it by creating the right indexes.

---

## What Is Filesort in MySQL?

Despite its name, "filesort" does not necessarily write to disk. It refers to an additional sorting step MySQL performs when it cannot use an index to satisfy an `ORDER BY` or `GROUP BY` clause. The sort happens in memory if the result set fits in `sort_buffer_size`, otherwise it spills to temporary disk files - making it slower.

## Detecting Filesort with EXPLAIN

Run `EXPLAIN` on your query and look for `Using filesort` in the `Extra` column:

```sql
EXPLAIN SELECT id, name, created_at FROM users ORDER BY created_at DESC;
```

```text
id | type | key  | rows   | Extra
1  | ALL  | NULL | 500000 | Using filesort
```

The combination of `type: ALL` and `Using filesort` means MySQL is doing a full scan and then sorting all rows.

## Common Causes of Filesort

### No index on the ORDER BY column

```sql
-- No index on price
EXPLAIN SELECT * FROM products ORDER BY price ASC;
-- Extra: Using filesort
```

### Index exists but wrong column order

```sql
CREATE INDEX idx_category_price ON products(category, price);

-- This can use the index for sorting:
EXPLAIN SELECT * FROM products WHERE category = 'electronics' ORDER BY price;
-- Extra: Using where (no Using filesort)

-- But this cannot - the WHERE skips the leading column:
EXPLAIN SELECT * FROM products ORDER BY price;
-- Extra: Using filesort
```

### Mixing ASC and DESC in older MySQL versions

```sql
-- Before MySQL 8.0, mixed sort directions caused filesort
EXPLAIN SELECT * FROM orders ORDER BY customer_id ASC, amount DESC;
-- Extra: Using filesort (MySQL 5.7)
```

MySQL 8.0 introduced descending indexes that resolve this:

```sql
CREATE INDEX idx_cust_amount ON orders(customer_id ASC, amount DESC);
```

## Fixing Filesort with an Index

```sql
-- Problem query
EXPLAIN SELECT id, title, published_at FROM posts
WHERE author_id = 5
ORDER BY published_at DESC
LIMIT 10;
-- Extra: Using where; Using filesort

-- Solution: composite index with filter + sort columns
CREATE INDEX idx_author_published ON posts(author_id, published_at DESC);

-- Re-check
EXPLAIN SELECT id, title, published_at FROM posts
WHERE author_id = 5
ORDER BY published_at DESC
LIMIT 10;
-- Extra: Using where (filesort eliminated)
```

## When Filesort Cannot Be Avoided

Some scenarios always require a sort:

```sql
-- Sorting on a computed expression
EXPLAIN SELECT * FROM orders ORDER BY YEAR(created_at), MONTH(created_at);
-- Extra: Using filesort (cannot use index on expressions without generated column)
```

For expression-based sorting, consider a generated column:

```sql
ALTER TABLE orders ADD COLUMN created_year_month VARCHAR(7)
  AS (DATE_FORMAT(created_at, '%Y-%m')) STORED;
CREATE INDEX idx_ym ON orders(created_year_month);
```

## Tuning the Sort Buffer

If filesort is unavoidable, increase the buffer to keep sorting in memory:

```sql
-- Session-level adjustment
SET SESSION sort_buffer_size = 8 * 1024 * 1024;  -- 8MB

-- Check current value
SHOW VARIABLES LIKE 'sort_buffer_size';
```

## Summary

`Using filesort` in EXPLAIN's Extra column signals an extra sorting pass that can be expensive at scale. The fix is almost always creating an index that matches both the WHERE and ORDER BY clauses in the correct column order. For MySQL 8.0 and later, use descending index syntax when your queries mix sort directions. Always re-run EXPLAIN after adding indexes to confirm the filesort has been eliminated.
