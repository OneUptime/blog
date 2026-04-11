# How to Use the -> and ->> JSON Operators in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database, Operator

Description: Learn how to use MySQL JSON path operators -> and ->> as shorthand for JSON_EXTRACT and JSON_UNQUOTE to query JSON columns concisely.

---

## What the Operators Do

MySQL provides two inline JSON path operators as syntactic sugar over function calls:

| Operator | Equivalent to | Returns |
|---|---|---|
| `->` | `JSON_EXTRACT(col, path)` | JSON-encoded value (strings include quotes) |
| `->>` | `JSON_UNQUOTE(JSON_EXTRACT(col, path))` | Plain string (quotes stripped) |

The `->` operator was introduced in MySQL 5.7.9 and `->>` in MySQL 5.7.13, both for use with table columns. Support for user variables as the left-hand operand was added in MySQL 8.0.21.

```sql
SET @city_doc = '{"city": "Paris"}';

SELECT @city_doc->>'$.city';
-- Paris   (no surrounding quotes)

SELECT @city_doc->'$.city';
-- "Paris" (JSON string with quotes)
```

## Operator Syntax

```sql
column -> 'path'
column ->> 'path'
```

The path must be a string literal (not a column reference) using JSONPath syntax with `$` as the root.

## Comparing -> and ->>

```sql
SET @doc = '{"score": 95, "label": "excellent"}';

-- -> returns JSON encoding
SELECT @doc->'$.label';    -- "excellent"
SELECT @doc->'$.score';    -- 95

-- ->> returns unquoted string
SELECT @doc->>'$.label';   -- excellent
SELECT @doc->>'$.score';   -- 95
```

For numeric values the difference is invisible in `SELECT` output, but it matters in comparisons:

```sql
-- -> returns a JSON value; MySQL coerces for comparison
SELECT @doc->'$.score' = 95;    -- 1 (MySQL coerces JSON integer to SQL integer)

-- String comparison: "95" vs "95" (both strings)
SELECT @doc->>'$.score' = '95'; -- 1

-- Best practice: cast when comparing numbers
SELECT CAST(@doc->>'$.score' AS UNSIGNED) > 90; -- 1
```

## Using the Operators with a Table

```sql
CREATE TABLE users (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  profile JSON NOT NULL
);

INSERT INTO users (profile) VALUES
  ('{"name": "Alice", "age": 28, "city": "Toronto"}'),
  ('{"name": "Bob",   "age": 34, "city": "Berlin"}'),
  ('{"name": "Carol", "age": 22, "city": "Toronto"}');
```

Select individual fields:

```sql
SELECT
  id,
  profile->>'$.name' AS name,
  profile->>'$.city' AS city,
  CAST(profile->>'$.age' AS UNSIGNED) AS age
FROM users;
```

Filter rows:

```sql
SELECT profile->>'$.name' AS name
FROM users
WHERE profile->>'$.city' = 'Toronto';
```

```text
Alice
Carol
```

## Nested Paths and Arrays

```sql
SET @order = '{"items": [{"sku": "A1", "qty": 2}, {"sku": "B2", "qty": 1}]}';

-- Access first array element key
SELECT @order->'$.items[0].sku';   -- "A1"
SELECT @order->>'$.items[0].sku';  -- A1

-- All SKUs as JSON array
SELECT @order->'$.items[*].sku';   -- ["A1", "B2"]
```

## Using in ORDER BY and GROUP BY

```sql
-- Sort by JSON field
SELECT profile->>'$.name' AS name
FROM users
ORDER BY profile->>'$.age' + 0;  -- cast to number for numeric sort

-- Group by JSON field
SELECT
  profile->>'$.city' AS city,
  COUNT(*) AS user_count
FROM users
GROUP BY profile->>'$.city';
```

## WHERE Clause Filtering

```sql
-- Users older than 25
SELECT profile->>'$.name'
FROM users
WHERE CAST(profile->>'$.age' AS UNSIGNED) > 25;
```

## When to Use -> vs ->>

Use `->` when you need to pass the result to another JSON function (it preserves JSON type). Use `->>` for comparisons with SQL string literals, `IN()` lists, and display output where you want plain text without quotes.

```sql
-- Pass JSON-encoded value to JSON_TYPE
SELECT JSON_TYPE(profile->'$.age') FROM users LIMIT 1;
-- INTEGER

-- Use ->> for plain string comparison
SELECT * FROM users WHERE profile->>'$.name' = 'Alice';
```

## Summary

The `->` operator is shorthand for `JSON_EXTRACT()` and returns JSON-encoded values. The `->>` operator is shorthand for `JSON_UNQUOTE(JSON_EXTRACT())` and returns plain strings. Use `->` when piping results to other JSON functions, and `->>` when comparing to SQL string literals or displaying output. Always cast numeric JSON values with `CAST()` before arithmetic or numeric comparisons.
