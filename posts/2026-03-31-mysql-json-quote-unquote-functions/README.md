# How to Use JSON_QUOTE() and JSON_UNQUOTE() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Function

Description: Learn how MySQL's JSON_QUOTE() and JSON_UNQUOTE() functions convert between SQL strings and JSON string literals for safe JSON construction.

---

## Overview

MySQL provides two complementary functions for handling JSON string escaping:

- `JSON_QUOTE(string)` - wraps a string in double quotes and escapes special characters to produce a valid JSON string literal
- `JSON_UNQUOTE(json_val)` - removes the outer double quotes from a JSON string and unescapes special characters, returning a SQL string

Both functions are essential when you need to safely embed arbitrary text into JSON documents or extract clean string values from JSON.

## JSON_QUOTE() Usage

`JSON_QUOTE()` takes a SQL string and makes it a valid JSON string:

```sql
SELECT JSON_QUOTE('Hello, World!');
-- Result: "Hello, World!"

SELECT JSON_QUOTE('He said "hello"');
-- Result: "He said \"hello\""

SELECT JSON_QUOTE('line1\nline2');
-- Result: "line1\nline2"

SELECT JSON_QUOTE(NULL);
-- Result: NULL
```

The function escapes double quotes, backslashes, newlines, tabs, and other control characters.

## Building Safe JSON Strings

Without `JSON_QUOTE()`, embedding user input into JSON can break document structure:

```sql
SET @user_input = 'O\'Reilly & "Associates"';

-- Unsafe manual construction
SELECT CONCAT('{"name": "', @user_input, '"}');
-- Produces malformed JSON

-- Safe with JSON_OBJECT()
SELECT JSON_OBJECT('name', @user_input);
-- Produces: {"name": "O'Reilly & \"Associates\""}
```

In practice, prefer `JSON_OBJECT()` and `JSON_ARRAY()` over manual concatenation - they call `JSON_QUOTE()` internally.

## JSON_UNQUOTE() Usage

`JSON_UNQUOTE()` extracts the raw string value from a JSON string literal:

```sql
SELECT JSON_UNQUOTE('"Hello, World!"');
-- Result: Hello, World!  (no quotes)

SELECT JSON_UNQUOTE('"He said \\"hello\\""');
-- Result: He said "hello"

SELECT JSON_UNQUOTE('null');
-- Result: null  (the string "null", not SQL NULL)
```

## Using with JSON Path Extraction

The `->` operator returns JSON-typed values with quotes. `JSON_UNQUOTE()` removes them:

```sql
CREATE TABLE users (id INT, profile JSON);
INSERT INTO users VALUES (1, '{"name": "Alice", "city": "New York"}');

-- Returns JSON string with quotes
SELECT profile->'$.name' FROM users WHERE id = 1;
-- Result: "Alice"

-- Returns plain SQL string
SELECT JSON_UNQUOTE(profile->'$.name') FROM users WHERE id = 1;
-- Result: Alice

-- Shorthand operator ->> does the same as JSON_UNQUOTE(... -> ...)
SELECT profile->>'$.name' FROM users WHERE id = 1;
-- Result: Alice
```

The `->>` operator is the most common way to extract unquoted string values.

## Comparing Extracted Values

When comparing JSON-extracted strings, `JSON_UNQUOTE()` (or `->>`) is necessary:

```sql
-- This fails to match because profile->'$.city' returns "\"New York\""
SELECT * FROM users WHERE profile->'$.city' = 'New York';

-- This works correctly
SELECT * FROM users WHERE profile->>'$.city' = 'New York';
```

## Round-Trip Example

```sql
SET @original = 'tab	and newline\n';
SET @quoted = JSON_QUOTE(@original);
SELECT @quoted;
-- "tab\tand newline\n"

SELECT JSON_UNQUOTE(@quoted);
-- tab	and newline\n  (original string restored)
```

## Summary

`JSON_QUOTE()` safely encodes a SQL string into a JSON string literal, while `JSON_UNQUOTE()` reverses the process. In everyday use, the `->>` operator provides a convenient shorthand for `JSON_UNQUOTE(col->'$.path')`. Understanding these functions is fundamental to safely constructing and consuming JSON in MySQL.
