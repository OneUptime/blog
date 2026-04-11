# How to Convert JSON to Relational Rows with JSON_TABLE() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, JSON_TABLE, Relational Data, Query

Description: Learn how to use MySQL's JSON_TABLE() function to convert JSON arrays and objects into regular relational rows you can query with SQL.

---

## What is JSON_TABLE()?

MySQL 8.0 introduced `JSON_TABLE()`, a table-valued function that extracts data from a JSON document and returns it as a relational table. This lets you use standard SQL (WHERE, JOIN, GROUP BY, aggregations) directly against JSON data without writing custom application-side parsing.

The result is a virtual table that behaves like any other table in a FROM clause.

## Basic Syntax

```sql
JSON_TABLE(
  json_expression,
  path COLUMNS (
    column_name type PATH column_path [on_empty] [on_error],
    ...
  )
) [AS] alias
```

- `json_expression` - a JSON value or column
- `path` - the root path to iterate over (use `$` for the document root, `$[*]` to iterate an array)
- `COLUMNS` - defines the output columns and their source paths

## Converting a JSON Array to Rows

Suppose you store order items as a JSON array:

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer VARCHAR(100),
  items JSON
);

INSERT INTO orders VALUES
  (1, 'Alice', '[{"product":"Widget","qty":3,"price":9.99},{"product":"Gadget","qty":1,"price":24.50}]'),
  (2, 'Bob',   '[{"product":"Widget","qty":5,"price":9.99}]');
```

Use `JSON_TABLE()` to expand the `items` array into individual rows:

```sql
SELECT
  o.id,
  o.customer,
  jt.product,
  jt.qty,
  jt.price,
  jt.qty * jt.price AS line_total
FROM orders o,
  JSON_TABLE(
    o.items,
    '$[*]'
    COLUMNS (
      product VARCHAR(100) PATH '$.product',
      qty     INT          PATH '$.qty',
      price   DECIMAL(8,2) PATH '$.price'
    )
  ) AS jt;
```

Result:

```text
+----+----------+---------+-----+-------+------------+
| id | customer | product | qty | price | line_total |
+----+----------+---------+-----+-------+------------+
|  1 | Alice    | Widget  |   3 |  9.99 |      29.97 |
|  1 | Alice    | Gadget  |   1 | 24.50 |      24.50 |
|  2 | Bob      | Widget  |   5 |  9.99 |      49.95 |
+----+----------+---------+-----+-------+------------+
```

## Handling Missing Keys with ON EMPTY

JSON documents are often inconsistent. Use `ON EMPTY` to provide a default value when a path does not exist:

```sql
SELECT jt.*
FROM orders o,
  JSON_TABLE(
    o.items,
    '$[*]'
    COLUMNS (
      product  VARCHAR(100) PATH '$.product'  DEFAULT 'Unknown' ON EMPTY,
      qty      INT          PATH '$.qty'      DEFAULT 0         ON EMPTY,
      discount DECIMAL(4,2) PATH '$.discount' DEFAULT 0.00      ON EMPTY
    )
  ) AS jt;
```

## Handling Errors with ON ERROR

If a path value cannot be cast to the declared type, you can control what happens:

```sql
JSON_TABLE(
  json_col,
  '$[*]'
  COLUMNS (
    price DECIMAL(8,2) PATH '$.price'
      DEFAULT 0.00  ON EMPTY
      DEFAULT -1.00 ON ERROR
  )
) AS jt
```

Options for both ON ERROR and ON EMPTY are:
- `NULL` - return NULL (default)
- `DEFAULT literal` - return a specific value
- `ERROR` - raise an error and stop

## Extracting Nested Objects

`JSON_TABLE()` supports nested paths with `NESTED PATH`, letting you flatten multi-level arrays in one pass:

```sql
SELECT c.name, ord.order_id, ord.product
FROM customers c,
  JSON_TABLE(
    c.data,
    '$.orders[*]'
    COLUMNS (
      order_id INT PATH '$.id',
      NESTED PATH '$.items[*]' COLUMNS (
        product VARCHAR(100) PATH '$.product'
      )
    )
  ) AS ord;
```

## Aggregating JSON Data After Expansion

Because `JSON_TABLE()` produces a real table, you can aggregate directly:

```sql
SELECT
  o.customer,
  COUNT(jt.product) AS item_count,
  SUM(jt.qty * jt.price) AS order_total
FROM orders o,
  JSON_TABLE(
    o.items,
    '$[*]'
    COLUMNS (
      product VARCHAR(100) PATH '$.product',
      qty     INT          PATH '$.qty',
      price   DECIMAL(8,2) PATH '$.price'
    )
  ) AS jt
GROUP BY o.customer;
```

## Monitoring JSON_TABLE() Performance

`JSON_TABLE()` can be expensive on large JSON columns. Always check the query plan:

```sql
EXPLAIN FORMAT=JSON
SELECT jt.*
FROM orders o,
  JSON_TABLE(o.items, '$[*]' COLUMNS (product VARCHAR(100) PATH '$.product')) AS jt\G
```

If you query JSON data frequently, consider generating virtual columns and indexing them instead of relying on `JSON_TABLE()` for every query.

## Summary

`JSON_TABLE()` bridges the gap between JSON storage and relational SQL in MySQL 8. It converts JSON arrays and objects into queryable rows using a declarative COLUMNS clause, supports ON EMPTY and ON ERROR handlers for resilience, and integrates naturally with JOINs, GROUP BY, and aggregations. For high-frequency queries, pair it with generated columns and indexes to keep performance acceptable.
