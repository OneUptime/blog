# How to Use FETCH FIRST N ROWS in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Pagination, Standard, Query

Description: Learn how to use the SQL standard FETCH FIRST N ROWS syntax in MySQL 8.0 for cleaner, portable result set limiting and pagination.

---

## MySQL Pagination Syntax

MySQL uses `LIMIT` and `OFFSET` for pagination. These are MySQL-specific extensions to SQL. Unlike databases such as PostgreSQL, Oracle, and SQL Server, MySQL 8.0 does not support the SQL standard `FETCH FIRST` / `FETCH NEXT` syntax (SQL:2008). To limit result sets in MySQL, use `LIMIT`.

## Basic LIMIT Syntax

```sql
-- Fetch first 10 rows
SELECT id, name, price
FROM products
ORDER BY price DESC
LIMIT 10;
```

This returns the top 10 rows ordered by price. `LIMIT` is MySQL's equivalent of the SQL:2008 standard `FETCH FIRST N ROWS ONLY`.

## LIMIT with OFFSET for Pagination

Use `LIMIT` combined with `OFFSET` for pagination:

```sql
-- Page 1: rows 1-10
SELECT id, name, price
FROM products
ORDER BY price DESC
LIMIT 10 OFFSET 0;

-- Page 2: rows 11-20
SELECT id, name, price
FROM products
ORDER BY price DESC
LIMIT 10 OFFSET 10;

-- Page 3: rows 21-30
SELECT id, name, price
FROM products
ORDER BY price DESC
LIMIT 10 OFFSET 20;
```

## Syntax Variations

MySQL supports two forms of `LIMIT` with an offset:

```sql
-- These two are equivalent
SELECT * FROM products ORDER BY id LIMIT 5 OFFSET 10;
SELECT * FROM products ORDER BY id LIMIT 10, 5;
```

In the comma-separated form (`LIMIT offset, count`), the first value is the offset and the second is the row count. Note that this order is reversed compared to the `LIMIT count OFFSET offset` form.

## Emulating WITH TIES Using Window Functions

Some databases support `FETCH FIRST N ROWS WITH TIES`, which returns extra rows that tie with the last row. MySQL does not support this syntax, but you can emulate it using window functions:

```sql
-- Return top 3 products by price, including all ties for 3rd place
SELECT id, name, price
FROM (
    SELECT id, name, price,
           RANK() OVER (ORDER BY price DESC) AS rnk
    FROM products
) ranked
WHERE rnk <= 3;
```

If multiple products share the 3rd highest price, all of them are returned.

## Practical Pagination Example

```sql
-- Pagination with prepared statements
-- (user variables cannot be used directly in LIMIT/OFFSET
--  outside of prepared statements or stored programs)
SET @page = 2;
SET @page_size = 10;
SET @offset_val = (@page - 1) * @page_size;

PREPARE stmt FROM
    'SELECT id, name, price, created_at
     FROM products
     WHERE category = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?';

SET @cat = 'electronics';
EXECUTE stmt USING @cat, @page_size, @offset_val;
DEALLOCATE PREPARE stmt;
```

## Performance Considerations

`LIMIT/OFFSET` requires MySQL to scan and discard offset rows before returning results. For deep pagination on large tables, consider keyset pagination instead:

```sql
-- Efficient keyset pagination (no offset scanning)
SELECT id, name, price
FROM products
WHERE id > @last_seen_id
ORDER BY id
LIMIT 10;
```

## Summary

MySQL 8.0 uses `LIMIT` and `OFFSET` for result set limiting and pagination. Unlike PostgreSQL, Oracle, and SQL Server, MySQL does not support the SQL standard `FETCH FIRST N ROWS ONLY` syntax. The `LIMIT` clause is functionally equivalent and supports all common pagination patterns. For top-N queries where ties matter, use window functions like `RANK()` as a workaround. For large datasets with deep pagination, keyset pagination avoids the overhead of scanning offset rows.
