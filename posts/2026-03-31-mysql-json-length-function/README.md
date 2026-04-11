# How to Use JSON_LENGTH() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database

Description: Learn how to use MySQL JSON_LENGTH() to count elements in a JSON array, keys in a JSON object, or determine the size of any JSON value.

---

## What JSON_LENGTH() Does

`JSON_LENGTH()` returns the number of elements in a JSON value:

- For a JSON **array**: returns the number of elements
- For a JSON **object**: returns the number of key-value pairs
- For a JSON **scalar** (string, number, boolean, null): returns 1

```mermaid
flowchart TD
    A[JSON value] --> B{What type?}
    B -->|Array| C[Count elements\n'[1,2,3]' -> 3]
    B -->|Object| D[Count keys\n'{"a":1,"b":2}' -> 2]
    B -->|Scalar| E[Returns 1\n'"hello"' -> 1]
    B -->|NULL or path missing| F[Returns NULL]
```

## Syntax

```sql
JSON_LENGTH(json_doc [, path])
```

- `json_doc` - a JSON column or expression
- `path` (optional) - evaluate length at this sub-path

## Setup: Sample Table

```sql
CREATE TABLE products (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100),
    attributes JSON
);

INSERT INTO products (name, attributes) VALUES
('Laptop Pro',
 '{"brand": "TechCorp", "cpu": "i9", "tags": ["featured", "sale", "new"],
   "specs": {"ram_gb": 32, "storage_gb": 512, "ports": ["USB-A", "USB-C", "HDMI"]}}'),
('Budget Phone',
 '{"brand": "PhoneCo", "color": "black", "tags": ["budget"],
   "specs": {"storage_gb": 128, "ports": ["USB-C"]}}'),
('Wireless Mouse',
 '{"brand": "ClickInc", "dpi": 1600, "wireless": true, "tags": ["accessory", "new"],
   "specs": {"buttons": 5}}');
```

## Array Length

```sql
SELECT
    name,
    JSON_LENGTH(attributes, '$.tags')         AS tag_count,
    JSON_LENGTH(attributes, '$.specs.ports')  AS port_count
FROM products;
```

```text
+----------------+-----------+------------+
| name           | tag_count | port_count |
+----------------+-----------+------------+
| Laptop Pro     |         3 |          3 |
| Budget Phone   |         1 |          1 |
| Wireless Mouse |         2 |       NULL |  -- no ports key
+----------------+-----------+------------+
```

## Object Length (Key Count)

```sql
SELECT
    name,
    JSON_LENGTH(attributes)                   AS root_key_count,
    JSON_LENGTH(attributes, '$.specs')        AS specs_key_count
FROM products;
```

```text
+----------------+----------------+-----------------+
| name           | root_key_count | specs_key_count |
+----------------+----------------+-----------------+
| Laptop Pro     |              4 |               3 |
| Budget Phone   |              4 |               2 |
| Wireless Mouse |              5 |               1 |
+----------------+----------------+-----------------+
```

## Filtering by Array Length

```sql
-- Products with more than one tag
SELECT name, attributes -> '$.tags' AS tags
FROM products
WHERE JSON_LENGTH(attributes, '$.tags') > 1;
```

```text
+----------------+--------------------------+
| name           | tags                     |
+----------------+--------------------------+
| Laptop Pro     | ["featured", "sale", "new"] |
| Wireless Mouse | ["accessory", "new"]     |
+----------------+--------------------------+
```

```sql
-- Products with exactly one port or no port information
SELECT name
FROM products
WHERE JSON_LENGTH(attributes, '$.specs.ports') <= 1
   OR JSON_LENGTH(attributes, '$.specs.ports') IS NULL;
```

## Using JSON_LENGTH() with Scalars

```sql
SELECT
    JSON_LENGTH('"hello"')      AS string_len,   -- 1
    JSON_LENGTH('42')           AS number_len,   -- 1
    JSON_LENGTH('true')         AS bool_len,     -- 1
    JSON_LENGTH('null')         AS null_val_len; -- 1
```

Scalars always return 1. To get the character length of a JSON string value, use `CHAR_LENGTH(JSON_UNQUOTE(...))`.

## NULL Handling

```sql
SELECT JSON_LENGTH(NULL);                        -- NULL
SELECT JSON_LENGTH('{"a": 1}', '$.missing');    -- NULL (path does not exist)
```

## Aggregating Lengths

```sql
SELECT
    AVG(JSON_LENGTH(attributes, '$.tags'))  AS avg_tags,
    MAX(JSON_LENGTH(attributes, '$.tags'))  AS max_tags,
    SUM(JSON_LENGTH(attributes, '$.tags'))  AS total_tags
FROM products;
```

## Comparing JSON_LENGTH() with COUNT()

`JSON_LENGTH()` counts elements within a stored JSON column. `COUNT()` counts rows in a result set. Use `JSON_LENGTH()` when the array lives inside a column; use `COUNT()` when each value is in its own row.

```sql
-- Total number of tags across all products
SELECT SUM(JSON_LENGTH(attributes, '$.tags')) AS grand_total_tags
FROM products;
```

## Checking Array Bounds Before Accessing by Index

```sql
-- Safe access: only read third tag if it exists
SELECT
    name,
    CASE
        WHEN JSON_LENGTH(attributes, '$.tags') >= 3
        THEN attributes ->> '$.tags[2]'
        ELSE NULL
    END AS third_tag
FROM products;
```

## Summary

`JSON_LENGTH()` counts the elements of a JSON array, the keys of a JSON object, or returns 1 for scalar values. Pair it with an optional path argument to measure nested arrays or objects. It returns `NULL` when the path does not exist or any argument is `NULL`. Common uses include filtering rows by array size, computing aggregate statistics on JSON collections, and safely checking array bounds before index-based access.
