# How to Use concat() and || Operator in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, concat, String Concatenation, SQL

Description: Learn how to concatenate strings in ClickHouse using the concat() function and the || pipe operator, with practical examples for string building.

---

## String Concatenation in ClickHouse

ClickHouse provides three main ways to concatenate strings:

1. `concat(s1, s2, ...)` function - concatenates any number of strings
2. `||` operator - binary concatenation operator
3. `concatWithSeparator(sep, s1, s2, ...)` - join strings with a separator

```sql
-- Basic examples
SELECT concat('Hello', ' ', 'World');  -- 'Hello World'
SELECT 'Hello' || ' ' || 'World';      -- 'Hello World'
SELECT concatWithSeparator(', ', 'a', 'b', 'c');  -- 'a, b, c'
```

## concat() Function

`concat()` takes two or more string arguments and returns them joined:

```sql
CREATE TABLE users (
    user_id UInt64,
    first_name String,
    last_name String,
    city String,
    country LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY user_id;

-- Build full name
SELECT concat(first_name, ' ', last_name) AS full_name
FROM users;

-- Build address string
SELECT concat(city, ', ', country) AS location
FROM users;

-- Concatenate with non-string values (auto-cast)
SELECT concat('User #', toString(user_id), ': ', first_name)
FROM users;
```

## The || Operator

The `||` operator is the SQL standard concatenation operator. It is equivalent to `concat()`:

```sql
-- These are equivalent:
SELECT first_name || ' ' || last_name AS full_name FROM users;
SELECT concat(first_name, ' ', last_name) AS full_name FROM users;

-- Building a URL
SELECT 'https://example.com/users/' || toString(user_id) AS profile_url
FROM users;

-- Multiple pipes
SELECT '[' || city || ', ' || country || ']' AS formatted_location
FROM users;
```

## concatWithSeparator

For joining multiple values with a consistent separator:

```sql
-- Join with a separator
SELECT concatWithSeparator(' | ', first_name, last_name, city) AS combined
FROM users;

-- Build CSV row
SELECT concatWithSeparator(',',
    toString(user_id),
    first_name,
    last_name,
    city,
    country
) AS csv_row
FROM users;

-- Useful for log formatting
SELECT concatWithSeparator(' ',
    '[' || toString(now()) || ']',
    '[INFO]',
    'User ' || toString(user_id) || ' logged in'
) AS log_line
FROM users
LIMIT 5;
```

## Concatenating with NULL Values

```sql
-- concat() returns NULL if any argument is NULL
SELECT concat('hello', NULL, 'world');  -- returns NULL

-- Use coalesce or ifNull to handle NULLs
SELECT concat(first_name, ' ', ifNull(middle_name, ''), last_name)
FROM users;

-- Note: concatWithSeparator also propagates NULL (unlike MySQL's CONCAT_WS)
-- so handle NULLs explicitly
SELECT
    user_id,
    concat(
        first_name,
        if(middle_name != '', concat(' ', middle_name), ''),
        ' ',
        last_name
    ) AS full_name
FROM users;
```

## Building Dynamic Strings

```sql
-- Build query strings dynamically
SELECT
    'SELECT * FROM ' || table_name || ' LIMIT 10' AS query_string
FROM system.tables
WHERE database = 'default';

-- Format email addresses
SELECT
    lower(first_name) || '.' || lower(last_name) || '@company.com' AS email
FROM employees;

-- Build JSON manually (when needed)
SELECT
    concat(
        '{"user_id":', toString(user_id),
        ',"name":"', first_name, ' ', last_name,
        '","city":"', city, '"}'
    ) AS json_string
FROM users;
```

## Performance Comparison

```sql
-- concat() is generally slightly faster than || for many arguments
-- because || is converted to concat() internally

-- For repeated concatenation in a loop pattern, arrayStringConcat is better
SELECT arrayStringConcat(['a', 'b', 'c', 'd'], '-');  -- 'a-b-c-d'

-- For large number of strings, use arrayStringConcat
SELECT arrayStringConcat(groupArray(city), ', ') AS all_cities
FROM users;
```

## Practical Example: Building Audit Log Entries

```sql
CREATE TABLE user_actions (
    action_id UInt64,
    user_id UInt64,
    action_type LowCardinality(String),
    resource_id UInt64,
    ts DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY ts;

-- Format audit log entries
SELECT
    concat(
        '[', formatDateTime(ts, '%Y-%m-%d %H:%M:%S'), '] ',
        'User#', toString(user_id), ' ',
        upper(action_type), ' ',
        'resource:', toString(resource_id)
    ) AS audit_entry
FROM user_actions
ORDER BY ts DESC
LIMIT 20;

-- Build notification messages
SELECT
    user_id,
    'Your ' || action_type || ' on resource ' || toString(resource_id) ||
    ' was completed at ' || formatDateTime(ts, '%H:%M') AS notification
FROM user_actions
WHERE ts >= now() - INTERVAL 1 HOUR;
```

## Summary

ClickHouse provides `concat(s1, s2, ...)` and the `||` operator for string concatenation, which are functionally equivalent. Use `concatWithSeparator(sep, s1, ...)` when joining multiple values with a consistent delimiter. Handle NULL values explicitly with `ifNull()` or `coalesce()` since `concat()` propagates NULLs. For joining arrays of strings, `arrayStringConcat()` is more efficient than repeated concatenation.
