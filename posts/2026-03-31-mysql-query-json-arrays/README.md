# How to Query JSON Arrays in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Query

Description: Learn how to query, filter, and manipulate JSON array elements in MySQL using path expressions, containment checks, and array-specific functions.

---

## Working with JSON Arrays

MySQL stores JSON arrays using the native JSON data type and provides dedicated syntax and functions to extract, filter, and manipulate individual elements.

Setup for examples:

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer VARCHAR(100),
  items JSON
);

INSERT INTO orders (customer, items) VALUES
  ('Alice', '[{"sku": "A1", "qty": 2}, {"sku": "B3", "qty": 1}]'),
  ('Bob', '[{"sku": "C7", "qty": 5}]'),
  ('Carol', '[{"sku": "A1", "qty": 1}, {"sku": "D2", "qty": 3}, {"sku": "E5", "qty": 2}]');
```

## Accessing Array Elements by Index

JSON arrays are zero-indexed. Use `[n]` in path expressions:

```sql
-- Get the first item
SELECT items->'$[0]' AS first_item FROM orders;

-- Get the SKU of the second item
SELECT items->>'$[1].sku' AS second_sku FROM orders WHERE id = 1;
-- Result: B3

-- Get the last element using last keyword (MySQL 8.0.21+)
SELECT items->>'$[last].sku' AS last_sku FROM orders;
```

## Getting Array Length

```sql
SELECT
  customer,
  JSON_LENGTH(items) AS item_count
FROM orders;
```

## Filtering Rows by Array Content

Use `JSON_CONTAINS()` to find rows where the array contains a specific value:

```sql
-- Find orders containing SKU 'A1'
SELECT id, customer FROM orders
WHERE JSON_CONTAINS(items, '{"sku": "A1"}');
```

Or use `MEMBER OF()` with a scalar array:

```sql
CREATE TABLE products (id INT, tags JSON);
INSERT INTO products VALUES (1, '["sale", "new", "featured"]'), (2, '["sale"]');

SELECT * FROM products WHERE 'new' MEMBER OF(tags);
```

## Checking for Overlapping Arrays

`JSON_OVERLAPS()` returns true if two arrays share at least one element:

```sql
SELECT * FROM products
WHERE JSON_OVERLAPS(tags, '["new", "featured"]');
-- Returns rows where tags contains "new" OR "featured"
```

## Extracting All Elements with JSON_TABLE()

Unnest an array into rows using `JSON_TABLE()`:

```sql
SELECT
  o.id,
  o.customer,
  jt.sku,
  jt.qty
FROM orders o,
JSON_TABLE(
  o.items,
  '$[*]' COLUMNS (
    sku VARCHAR(10) PATH '$.sku',
    qty INT PATH '$.qty'
  )
) AS jt;
```

Result: one row per array element per order.

## Aggregating Array Data

Combine extraction with aggregation:

```sql
-- Total quantity ordered per customer
SELECT
  o.customer,
  SUM(jt.qty) AS total_qty
FROM orders o,
JSON_TABLE(
  o.items,
  '$[*]' COLUMNS (qty INT PATH '$.qty')
) AS jt
GROUP BY o.customer;
```

## Appending to Arrays

```sql
UPDATE orders
SET items = JSON_ARRAY_APPEND(items, '$', JSON_OBJECT('sku', 'Z9', 'qty', 1))
WHERE id = 1;
```

## Removing Array Elements

```sql
-- Remove the element at index 0
UPDATE orders
SET items = JSON_REMOVE(items, '$[0]')
WHERE id = 1;
```

## Indexing Arrays for Fast Lookup

Add a multi-valued index on a scalar array for fast `MEMBER OF()` queries:

```sql
CREATE TABLE posts (id INT, tag_ids JSON,
  INDEX idx_tag_ids ((CAST(tag_ids AS UNSIGNED ARRAY)))
);
```

## Summary

Querying JSON arrays in MySQL combines path indexing syntax (`$[0]`, `$[*]`) with functions like `JSON_CONTAINS()`, `JSON_OVERLAPS()`, and `JSON_TABLE()`. For high-performance membership checks, pair `MEMBER OF()` with a multi-valued index. Use `JSON_TABLE()` to flatten array data into rows for aggregation.
