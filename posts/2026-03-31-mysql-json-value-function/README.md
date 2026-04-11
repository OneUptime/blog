# How to Use JSON_VALUE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Function

Description: Learn how MySQL's JSON_VALUE() function extracts scalar values from JSON documents with explicit type casting and error handling options.

---

## What Is JSON_VALUE()?

`JSON_VALUE()` was introduced in MySQL 8.0.21 as an SQL-standard way to extract a scalar value from a JSON document using a path expression. Unlike the `->` and `->>` operators, it supports explicit type casting and fine-grained error and empty-value handling.

Syntax:

```sql
JSON_VALUE(json_doc, path
  [RETURNING type]
  [on_empty_response]
  [on_error_response]
)
```

Where:
- `RETURNING type` casts the result to a specific SQL type
- `on_empty_response` specifies behavior when the path matches nothing
- `on_error_response` specifies behavior on type conversion errors

## Basic Extraction

```sql
SET @doc = '{"user": {"name": "Alice", "age": 30, "score": 98.5}}';

SELECT JSON_VALUE(@doc, '$.user.name');
-- Result: Alice

SELECT JSON_VALUE(@doc, '$.user.age');
-- Result: 30

SELECT JSON_VALUE(@doc, '$.user.score');
-- Result: 98.5
```

Without `RETURNING`, the result is a `VARCHAR(512)` by default.

## Using RETURNING for Type Casting

Specify the SQL type for proper type-safe extraction:

```sql
SELECT JSON_VALUE(@doc, '$.user.age' RETURNING UNSIGNED INTEGER);
-- Result: 30 (integer type)

SELECT JSON_VALUE(@doc, '$.user.score' RETURNING DECIMAL(10,2));
-- Result: 98.50

SELECT JSON_VALUE('{"ts": "2024-01-15"}', '$.ts' RETURNING DATE);
-- Result: 2024-01-15
```

Supported return types include: `SIGNED`, `UNSIGNED`, `DECIMAL`, `FLOAT`, `DOUBLE`, `DATE`, `TIME`, `DATETIME`, `CHAR`, `JSON`.

## Handling Empty Results

Control behavior when the path does not match:

```sql
-- Default: return NULL when path is missing
SELECT JSON_VALUE('{"a": 1}', '$.b');
-- Result: NULL

-- Return a specific default value
SELECT JSON_VALUE('{"a": 1}', '$.b' NULL ON EMPTY);
-- Result: NULL (explicit)

SELECT JSON_VALUE('{"a": 1}', '$.b' DEFAULT 'N/A' ON EMPTY);
-- Result: N/A

SELECT JSON_VALUE('{"a": 1}', '$.b' ERROR ON EMPTY);
-- Raises an error
```

## Handling Errors

Control behavior when type conversion fails:

```sql
SELECT JSON_VALUE('"not-a-number"', '$' RETURNING SIGNED ERROR ON ERROR);
-- Raises an error

SELECT JSON_VALUE('"not-a-number"', '$' RETURNING SIGNED DEFAULT -1 ON ERROR);
-- Result: -1

SELECT JSON_VALUE('"not-a-number"', '$' RETURNING SIGNED NULL ON ERROR);
-- Result: NULL
```

## Comparison with -> and ->> Operators

```sql
CREATE TABLE orders (id INT, data JSON);
INSERT INTO orders VALUES (1, '{"amount": 99.99, "status": "shipped"}');

-- Using ->> (unquotes but returns VARCHAR)
SELECT data->>'$.amount' FROM orders WHERE id = 1;
-- Result: 99.99 (string type, not numeric)

-- Using JSON_VALUE with RETURNING
SELECT JSON_VALUE(data, '$.amount' RETURNING DECIMAL(10,2)) FROM orders WHERE id = 1;
-- Result: 99.99 (decimal, usable in arithmetic)
```

`JSON_VALUE()` with `RETURNING` is the correct choice when you need numeric operations on extracted values.

## Using JSON_VALUE() in WHERE Clauses and Indexes

```sql
SELECT * FROM orders
WHERE JSON_VALUE(data, '$.status' RETURNING CHAR(20)) = 'shipped';
```

For frequently queried paths, use a generated column index:

```sql
ALTER TABLE orders
  ADD COLUMN status VARCHAR(20) GENERATED ALWAYS AS
    (JSON_VALUE(data, '$.status' RETURNING CHAR(20))) VIRTUAL,
  ADD INDEX idx_status (status);
```

## Summary

`JSON_VALUE()` provides SQL-standard, type-safe JSON extraction with explicit control over empty-path and error behavior. It is the preferred function when you need typed results from JSON documents, especially in calculations, comparisons, or indexed generated columns.
