# How to Use JSON_UNQUOTE() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database

Description: Learn how to use MySQL JSON_UNQUOTE() to strip the outer JSON string quotes from extracted values, and when to use the ->> operator as a shorthand.

---

## What JSON_UNQUOTE() Does

When you extract a string value from a JSON document using `JSON_EXTRACT()` or the `->` operator, the result is returned as a JSON string including surrounding double-quotes. `JSON_UNQUOTE()` removes those quotes and returns a plain SQL string.

```mermaid
flowchart TD
    A[JSON column\n'{"city": "New York"}'] --> B["JSON_EXTRACT / ->"]
    B --> C["JSON string: \"New York\""]
    C --> D[JSON_UNQUOTE]
    D --> E["SQL string: New York"]

    A --> F["->> operator"]
    F --> G["SQL string: New York\n(equivalent shorthand)"]
```

## Syntax

```sql
JSON_UNQUOTE(json_val)
```

Also available as the `->>` shorthand:

```sql
column ->> '$.path'
-- is equivalent to:
JSON_UNQUOTE(JSON_EXTRACT(column, '$.path'))
```

## The Difference Between `->` and `->>`

The `->` and `->>` operators require a column reference on the left side. To illustrate the difference with a literal JSON document, use the equivalent function forms:

```sql
SELECT
    JSON_EXTRACT('{"city": "New York"}', '$.city')                      AS with_quotes,
    JSON_UNQUOTE(JSON_EXTRACT('{"city": "New York"}', '$.city'))        AS without_quotes;
```

```text
+-------------+----------------+
| with_quotes | without_quotes |
+-------------+----------------+
| "New York"  | New York       |
+-------------+----------------+
```

`JSON_EXTRACT()` (or equivalently, `->` on a column) returns `"New York"` (with embedded quotes, as a JSON string). `JSON_UNQUOTE(JSON_EXTRACT(...))` (or equivalently, `->>` on a column) returns `New York` (a plain SQL string, ready for comparisons and string functions).

## Setup: Sample Table

```sql
CREATE TABLE contacts (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    name     VARCHAR(100),
    info     JSON
);

INSERT INTO contacts (name, info) VALUES
('Alice', '{"email": "alice@example.com", "phone": "+1-555-0101", "city": "Seattle"}'),
('Bob',   '{"email": "bob@example.com",   "phone": "+1-555-0202", "city": "Chicago"}'),
('Carol', '{"email": "carol@corp.com",     "phone": "+1-555-0303", "city": "New York"}');
```

## Basic Usage

```sql
SELECT
    name,
    JSON_EXTRACT(info, '$.email')           AS email_json,
    JSON_UNQUOTE(JSON_EXTRACT(info, '$.email')) AS email_plain,
    info ->> '$.email'                      AS email_shorthand
FROM contacts;
```

```text
+-------+----------------------+----------------------+----------------------+
| name  | email_json           | email_plain          | email_shorthand      |
+-------+----------------------+----------------------+----------------------+
| Alice | "alice@example.com"  | alice@example.com    | alice@example.com    |
| Bob   | "bob@example.com"    | bob@example.com      | bob@example.com      |
| Carol | "carol@corp.com"     | carol@corp.com       | carol@corp.com       |
+-------+----------------------+----------------------+----------------------+
```

## Why Unquoting Matters for Comparisons

```sql
-- This comparison fails because "New York" (JSON string) != 'New York' (SQL string)
SELECT name FROM contacts
WHERE info -> '$.city' = 'New York';
-- Returns 0 rows

-- This works correctly
SELECT name FROM contacts
WHERE info ->> '$.city' = 'New York';
-- Returns Carol

-- Equivalent using JSON_UNQUOTE
SELECT name FROM contacts
WHERE JSON_UNQUOTE(JSON_EXTRACT(info, '$.city')) = 'New York';
```

## Using JSON_UNQUOTE() with String Functions

Once unquoted, the result is a plain SQL string and all string functions work normally:

```sql
SELECT
    name,
    UPPER(info ->> '$.city')                  AS city_upper,
    LENGTH(info ->> '$.email')                AS email_length,
    SUBSTRING_INDEX(info ->> '$.email', '@', -1) AS domain
FROM contacts;
```

## JSON_UNQUOTE() for Non-String Values

For non-string JSON values (numbers, booleans, null), `JSON_UNQUOTE()` has no visible effect because they are not quoted in JSON output:

```sql
SELECT
    JSON_UNQUOTE('42')      AS number,     -- 42
    JSON_UNQUOTE('true')    AS bool_true,  -- true
    JSON_UNQUOTE('null')    AS null_val,   -- null
    JSON_UNQUOTE('"hello"') AS string_val; -- hello
```

## Using JSON_UNQUOTE() with JSON_SEARCH() Results

`JSON_SEARCH()` returns a path as a JSON string (e.g., `"$.tags[1]"`). Unquote it before using it as a path argument in another function:

```sql
SET @doc = '{"tags": ["sale", "new", "featured"]}';

SELECT
    JSON_SEARCH(@doc, 'one', 'new')                           AS path_json,
    JSON_UNQUOTE(JSON_SEARCH(@doc, 'one', 'new'))             AS path_plain,
    JSON_EXTRACT(@doc, JSON_UNQUOTE(JSON_SEARCH(@doc, 'one', 'new'))) AS value_at_path;
```

```text
+-----------+------------+---------------+
| path_json | path_plain | value_at_path |
+-----------+------------+---------------+
| "$.tags[1]"| $.tags[1] | "new"         |
+-----------+------------+---------------+
```

## NULL Handling

```sql
SELECT JSON_UNQUOTE(NULL);             -- NULL
SELECT JSON_UNQUOTE(JSON_EXTRACT('{"a": 1}', '$.missing'));  -- NULL (path not found)
```

## When to Use `->>`  vs `JSON_UNQUOTE(JSON_EXTRACT(...))`

The `->>` operator is shorthand and preferred for clarity in most cases:

```sql
-- Preferred
SELECT info ->> '$.city' FROM contacts;

-- Equivalent but verbose
SELECT JSON_UNQUOTE(JSON_EXTRACT(info, '$.city')) FROM contacts;
```

Use the explicit form when you need to compose more complex expressions or when using `JSON_SEARCH()` results as dynamic paths.

## Summary

`JSON_UNQUOTE()` removes the surrounding double-quotes from a JSON string value, converting it to a plain SQL string. The `->>` operator is syntactic sugar for `JSON_UNQUOTE(JSON_EXTRACT(...))` and is the preferred shorthand for most queries. Always use `->>` (or `JSON_UNQUOTE`) when comparing JSON string values against SQL string literals, passing extracted values to string functions, or using path results from `JSON_SEARCH()` as dynamic path arguments.
