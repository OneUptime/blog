# How to Use JSON Path Expressions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Path Expression

Description: Learn how MySQL JSON path expressions work, covering dot notation, array indexing, wildcards, and filters for precise document navigation.

---

## What Are JSON Path Expressions?

JSON path expressions are the addressing language used by all MySQL JSON functions to locate values within a JSON document. They follow the SQL/JSON standard and use `$` to represent the root of the document.

Every JSON function that extracts or modifies values - `JSON_EXTRACT()`, `JSON_SET()`, `JSON_CONTAINS_PATH()`, `->`, `->>` - accepts path expressions.

## Basic Syntax

```text
$               - root of the document
$.key           - object member access
$[n]            - array element at index n (zero-based)
$[last]         - last element of an array (MySQL 8.0.2+)
$[m to n]       - array slice from index m to n
$.key1.key2     - nested member access
```

## Examples with a Sample Document

```sql
SET @doc = '{
  "user": {
    "id": 42,
    "name": "Alice",
    "roles": ["admin", "editor"],
    "address": {
      "city": "New York",
      "zip": "10001"
    }
  }
}';

SELECT JSON_EXTRACT(@doc, '$.user.name');           -- "Alice"
SELECT JSON_EXTRACT(@doc, '$.user.id');             -- 42
SELECT JSON_EXTRACT(@doc, '$.user.roles[0]');       -- "admin"
SELECT JSON_EXTRACT(@doc, '$.user.roles[last]');    -- "editor"
SELECT JSON_EXTRACT(@doc, '$.user.address.city');   -- "New York"
```

## Arrow Operator Shorthand

The `->` and `->>` operators are shorthand for `JSON_EXTRACT()` and `JSON_UNQUOTE(JSON_EXTRACT())` respectively. They only work on table column references, not on variables or expressions:

```sql
-- These operators require a column on the left side
SELECT profile->'$.user.name' FROM users WHERE id = 1;
-- returns "Alice" (JSON string with quotes)

SELECT profile->>'$.user.name' FROM users WHERE id = 1;
-- returns Alice (unquoted SQL string)

-- For variables, use the function form instead
SELECT JSON_EXTRACT(@doc, '$.user.name');
-- returns "Alice"

SELECT JSON_UNQUOTE(JSON_EXTRACT(@doc, '$.user.name'));
-- returns Alice
```

## Wildcard Paths

Use `*` to match all members of an object or elements of an array:

```sql
-- All values in the address object (key order is not guaranteed across releases)
SELECT JSON_EXTRACT(@doc, '$.user.address.*');
-- Result: ["New York", "10001"]

-- All elements of the roles array
SELECT JSON_EXTRACT(@doc, '$.user.roles[*]');
-- Result: ["admin", "editor"]
```

## Recursive Wildcard - **

The `**` path component recursively descends through all nested structures:

```sql
-- Find all "city" values anywhere in the document
SELECT JSON_EXTRACT(@doc, '$**.city');
-- Result: ["New York"]
```

This is useful for searching deep documents where you don't know the nesting level.

## Array Ranges

Extract a subset of array elements:

```sql
SET @arr = '[10, 20, 30, 40, 50]';

SELECT JSON_EXTRACT(@arr, '$[1 to 3]');
-- Result: [20, 30, 40]

SELECT JSON_EXTRACT(@arr, '$[last-1 to last]');
-- Result: [40, 50]
```

## Checking Path Existence

Use `JSON_CONTAINS_PATH()` to test whether a path exists:

```sql
SELECT JSON_CONTAINS_PATH(@doc, 'one', '$.user.email');
-- Result: 0 (path does not exist)

SELECT JSON_CONTAINS_PATH(@doc, 'one', '$.user.name');
-- Result: 1

-- Check if ALL paths exist
SELECT JSON_CONTAINS_PATH(@doc, 'all', '$.user.name', '$.user.address.city');
-- Result: 1
```

## Using Paths in JSON_SET(), JSON_REMOVE()

```sql
-- Add a new field using a path
SET @doc = JSON_SET(@doc, '$.user.email', 'alice@example.com');

-- Remove a field
SET @doc = JSON_REMOVE(@doc, '$.user.address.zip');

-- Update an array element
SET @doc = JSON_SET(@doc, '$.user.roles[0]', 'superadmin');
```

## Summary

JSON path expressions are the foundation of all JSON operations in MySQL. Master `$`, dot notation, `[n]`, `[last]`, wildcards `*` and `**`, and range notation `[m to n]` to precisely navigate any document structure. Use `JSON_CONTAINS_PATH()` to safely check for path existence before extraction or modification.
