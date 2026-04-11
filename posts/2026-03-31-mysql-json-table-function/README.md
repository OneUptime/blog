# How to Use JSON_TABLE() Function in MySQL 8.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database, MySQL 8

Description: Learn how to use MySQL 8.0 JSON_TABLE() to transform JSON arrays and objects into relational rows and columns that you can query with standard SQL.

---

## What JSON_TABLE() Does

`JSON_TABLE()` is a table-valued function introduced in MySQL 8.0 that expands a JSON document into a set of relational rows. It lets you query JSON arrays as if they were rows in a table, enabling standard `JOIN`, `WHERE`, `GROUP BY`, and aggregation operations on JSON data.

```mermaid
flowchart TD
    A[JSON Array\n'[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]'] --> B[JSON_TABLE]
    B --> C[Relational Result Set]
    C --> D[Row 1: id=1, name=Alice]
    C --> E[Row 2: id=2, name=Bob]
    F[Standard SQL operations] --> G[JOIN, WHERE, GROUP BY, ...]
    C --> F
```

## Syntax

```sql
JSON_TABLE(
    expr,
    path COLUMNS (
        column_name type PATH col_path [on_empty] [on_error],
        column_name FOR ORDINALITY,
        NESTED PATH nested_path COLUMNS (...)
    )
) AS alias
```

Key clauses:
- `expr` - the JSON expression or column
- `path` - the root path (usually `'$[*]'` for arrays or `'$'` for an object)
- `COLUMNS(...)` - defines the output columns and their source paths
- `FOR ORDINALITY` - adds a 1-based row counter column
- `NESTED PATH` - expands nested arrays within each row

## Basic Usage: Expand a JSON Array

```sql
SELECT jt.*
FROM JSON_TABLE(
    '[{"id": 1, "name": "Alice", "score": 88.5},
      {"id": 2, "name": "Bob",   "score": 92.0},
      {"id": 3, "name": "Carol", "score": 76.3}]',
    '$[*]'
    COLUMNS (
        row_num INT    FOR ORDINALITY,
        id      INT    PATH '$.id',
        name    VARCHAR(50) PATH '$.name',
        score   DOUBLE PATH '$.score'
    )
) AS jt;
```

```text
+---------+----+-------+-------+
| row_num | id | name  | score |
+---------+----+-------+-------+
|       1 |  1 | Alice |  88.5 |
|       2 |  2 | Bob   |  92.0 |
|       3 |  3 | Carol |  76.3 |
+---------+----+-------+-------+
```

## Setup: Sample Table

```sql
CREATE TABLE orders (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    customer VARCHAR(100),
    payload  JSON
);

INSERT INTO orders (customer, payload) VALUES
('Alice', '{"status": "shipped", "items": [
    {"sku": "A1", "name": "Widget",  "qty": 2, "price": 19.99},
    {"sku": "B3", "name": "Gadget",  "qty": 1, "price": 49.99}
]}'),
('Bob', '{"status": "pending", "items": [
    {"sku": "C2", "name": "Gizmo",   "qty": 3, "price": 9.99}
]}'),
('Carol', '{"status": "delivered", "items": [
    {"sku": "A1", "name": "Widget",  "qty": 1, "price": 19.99},
    {"sku": "D5", "name": "Doohickey", "qty": 2, "price": 34.99}
]}');
```

## Joining JSON Array Elements with Table Rows

```sql
SELECT
    o.id            AS order_id,
    o.customer,
    o.payload ->> '$.status' AS status,
    jt.sku,
    jt.item_name,
    jt.qty,
    jt.price,
    jt.qty * jt.price AS line_total
FROM orders o,
JSON_TABLE(
    o.payload,
    '$.items[*]'
    COLUMNS (
        sku       VARCHAR(20)     PATH '$.sku',
        item_name VARCHAR(100)    PATH '$.name',
        qty       INT             PATH '$.qty',
        price     DECIMAL(10, 2)  PATH '$.price'
    )
) AS jt
ORDER BY o.id, jt.sku;
```

```text
+----------+----------+-----------+-----+-----------+-----+-------+------------+
| order_id | customer | status    | sku | item_name | qty | price | line_total |
+----------+----------+-----------+-----+-----------+-----+-------+------------+
|        1 | Alice    | shipped   | A1  | Widget    |   2 | 19.99 |      39.98 |
|        1 | Alice    | shipped   | B3  | Gadget    |   1 | 49.99 |      49.99 |
|        2 | Bob      | pending   | C2  | Gizmo     |   3 |  9.99 |      29.97 |
|        3 | Carol    | delivered | A1  | Widget    |   1 | 19.99 |      19.99 |
|        3 | Carol    | delivered | D5  | Doohickey |   2 | 34.99 |      69.98 |
+----------+----------+-----------+-----+-----------+-----+-------+------------+
```

## Aggregating Expanded JSON Data

```sql
-- Total revenue per customer
SELECT
    o.customer,
    SUM(jt.qty * jt.price) AS total_revenue,
    COUNT(*)               AS line_items
FROM orders o,
JSON_TABLE(
    o.payload,
    '$.items[*]'
    COLUMNS (
        qty   INT            PATH '$.qty',
        price DECIMAL(10, 2) PATH '$.price'
    )
) AS jt
GROUP BY o.customer
ORDER BY total_revenue DESC;
```

## Handling Missing Paths with ON EMPTY and ON ERROR

```sql
SELECT jt.*
FROM JSON_TABLE(
    '[{"id": 1, "score": 88}, {"id": 2}, {"id": 3, "score": null}]',
    '$[*]'
    COLUMNS (
        id    INT    PATH '$.id',
        score DOUBLE PATH '$.score'
            DEFAULT '0' ON EMPTY    -- use 0 if path is missing
            NULL ON ERROR            -- use NULL if path exists but has a type error
    )
) AS jt;
```

```text
+----+-------+
| id | score |
+----+-------+
|  1 |  88.0 |
|  2 |   0.0 |  -- default applied (missing path)
|  3 |  NULL |  -- JSON null
+----+-------+
```

## NESTED PATH: Expanding Multi-Level Arrays

```sql
SELECT jt.*
FROM JSON_TABLE(
    '[{"dept": "Eng",  "members": ["Alice", "Dave"]},
      {"dept": "HR",   "members": ["Carol"]},
      {"dept": "Sales","members": ["Bob", "Eve", "Frank"]}]',
    '$[*]'
    COLUMNS (
        dept    VARCHAR(50) PATH '$.dept',
        NESTED PATH '$.members[*]' COLUMNS (
            member_name VARCHAR(50) PATH '$'
        )
    )
) AS jt;
```

```text
+-------+-------------+
| dept  | member_name |
+-------+-------------+
| Eng   | Alice       |
| Eng   | Dave        |
| HR    | Carol       |
| Sales | Bob         |
| Sales | Eve         |
| Sales | Frank       |
+-------+-------------+
```

## Filtering Expanded Rows

```sql
-- Find all orders containing SKU 'A1'
SELECT DISTINCT o.customer, o.id
FROM orders o,
JSON_TABLE(
    o.payload,
    '$.items[*]' COLUMNS (sku VARCHAR(20) PATH '$.sku')
) AS jt
WHERE jt.sku = 'A1';
```

## Summary

`JSON_TABLE()` converts JSON arrays and objects into relational rows and columns, enabling standard SQL operations on JSON data. Use `'$[*]'` as the root path for arrays, define output columns with `PATH` expressions, add `FOR ORDINALITY` for a row counter, and handle missing or null values with `ON EMPTY` and `ON ERROR`. The `NESTED PATH` clause expands sub-arrays within each row into their own output rows. It is the most powerful MySQL JSON function for analytical queries and ETL tasks involving stored JSON arrays.
