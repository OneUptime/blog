# How to Use MEMBER OF() Operator with JSON Arrays in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Operator

Description: Learn how MySQL's MEMBER OF() operator checks if a value is contained in a JSON array, with examples for queries and multi-valued index usage.

---

## What Is MEMBER OF()?

The `MEMBER OF()` operator was introduced in MySQL 8.0.17 to test whether a given value exists as an element in a JSON array. It is more readable and index-friendly than using `JSON_CONTAINS()` for this purpose.

Syntax:

```sql
value MEMBER OF(json_array)
```

Returns `1` (true) if `value` is in the array, `0` (false) otherwise.

## Basic Usage

```sql
SELECT 3 MEMBER OF('[1, 2, 3, 4, 5]');
-- Result: 1

SELECT 6 MEMBER OF('[1, 2, 3, 4, 5]');
-- Result: 0

SELECT 'mysql' MEMBER OF('["mysql", "json", "database"]');
-- Result: 1

SELECT 'redis' MEMBER OF('["mysql", "json", "database"]');
-- Result: 0
```

Note that the value on the left must match the JSON type in the array. A string `'3'` does not match an integer `3`.

## Type Sensitivity

```sql
SELECT '3' MEMBER OF('[1, 2, 3]');
-- Result: 0  (string vs integer mismatch)

SELECT CAST('3' AS JSON) MEMBER OF('[1, 2, 3]');
-- Result: 1  (CAST parses '3' as JSON integer 3, which matches)

SELECT 3 MEMBER OF('[1, 2, 3]');
-- Result: 1  (correct integer match)
```

Always ensure the value type matches the array element type.

## Using MEMBER OF() in Queries

Filter rows where a JSON array column contains a specific value:

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  tags JSON
);

INSERT INTO products (name, tags) VALUES
  ('Laptop', '["electronics", "portable", "work"]'),
  ('Notebook', '["stationery", "writing"]'),
  ('Headphones', '["electronics", "audio"]');

SELECT id, name FROM products
WHERE 'electronics' MEMBER OF(tags);
```

Result:

```text
+----+------------+
| id | name       |
+----+------------+
|  1 | Laptop     |
|  3 | Headphones |
+----+------------+
```

## Comparison with JSON_CONTAINS()

Both expressions are logically equivalent for single-value containment checks:

```sql
-- These two queries are equivalent
SELECT * FROM products WHERE 'electronics' MEMBER OF(tags);
SELECT * FROM products WHERE JSON_CONTAINS(tags, '"electronics"');
```

`MEMBER OF()` is more readable and is the preferred form in MySQL 8.0.17+.

## Using with Multi-Valued Indexes

The key advantage of `MEMBER OF()` is that it can use multi-valued indexes for efficient lookups:

```sql
ALTER TABLE products
  ADD INDEX idx_tags ((CAST(tags AS CHAR(50) ARRAY)));
```

With the multi-valued index in place, `MEMBER OF()` performs an index lookup instead of a full table scan:

```sql
EXPLAIN SELECT * FROM products WHERE 'electronics' MEMBER OF(tags)\G
```

The execution plan will show `type: ref` and `key: idx_tags` instead of a full scan.

## Combining Multiple Conditions

Find products that are both electronics AND portable:

```sql
SELECT * FROM products
WHERE 'electronics' MEMBER OF(tags)
  AND 'portable' MEMBER OF(tags);
```

## NULL Handling

```sql
SELECT NULL MEMBER OF('[1, 2, NULL]');
-- Result: NULL (not 1)

SELECT 1 MEMBER OF(NULL);
-- Result: NULL
```

`MEMBER OF()` follows three-valued logic - comparisons involving `NULL` return `NULL`.

## Summary

`MEMBER OF()` provides a clean, SQL-standard syntax for testing JSON array membership in MySQL 8.0.17+. It is the recommended approach over `JSON_CONTAINS()` for single-value checks, especially when combined with multi-valued indexes for high-performance array queries.
