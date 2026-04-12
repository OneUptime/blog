# How to Use JSON_MERGE_PRESERVE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Json Merge Preserve, JSON, JSON Function, SQL

Description: Learn how to use MySQL's JSON_MERGE_PRESERVE() function to merge JSON documents while preserving duplicate keys by combining their values into arrays.

---

## Overview

`JSON_MERGE_PRESERVE()` merges two or more JSON documents while preserving all values for duplicate keys by combining them into JSON arrays. Unlike `JSON_MERGE_PATCH()`, which lets later values override earlier ones, `JSON_MERGE_PRESERVE()` keeps all values. It is the successor to the deprecated `JSON_MERGE()` function.

## Basic Syntax

```sql
JSON_MERGE_PRESERVE(json_doc, json_doc [, json_doc ...])
```

## Merging Behavior Rules

```text
1. Object + Object: keys are merged; duplicate key values become an array
2. Array + Array: arrays are concatenated
3. Scalar + Scalar: scalars are combined into an array
4. Array + Scalar: scalar is appended to the array
5. Object + Array: the object is wrapped in an array and concatenated
```

## Basic Examples

```sql
-- Merge two objects: duplicate keys preserved as arrays
SELECT JSON_MERGE_PRESERVE(
  '{"name":"Alice","score":10}',
  '{"name":"Bob","level":2}'
);
-- Result: {"name": ["Alice", "Bob"], "score": 10, "level": 2}

-- Merge two arrays: concatenated
SELECT JSON_MERGE_PRESERVE('[1, 2, 3]', '[4, 5, 6]');
-- Result: [1, 2, 3, 4, 5, 6]

-- Merge a scalar with an array: scalar appended
SELECT JSON_MERGE_PRESERVE('[1, 2]', '3');
-- Result: [1, 2, 3]

-- Merge three objects
SELECT JSON_MERGE_PRESERVE('{"a":1}', '{"b":2}', '{"c":3}');
-- Result: {"a": 1, "b": 2, "c": 3}
```

## Nested Object Merging

```sql
-- Nested objects are merged recursively
SELECT JSON_MERGE_PRESERVE(
  '{"user":{"name":"Alice","roles":["admin"]}}',
  '{"user":{"age":30,"roles":["editor"]}}'
);
-- Result: {"user": {"name": "Alice", "roles": ["admin", "editor"], "age": 30}}
```

## Aggregating JSON from Multiple Rows

```sql
CREATE TABLE user_tags (
  user_id INT,
  tags JSON
);

INSERT INTO user_tags VALUES
(1, '["mysql","sql"]'),
(1, '["database","backend"]'),
(2, '["redis","caching"]');

-- Combine all tags for each user using MIN/MAX as a workaround
-- (MySQL has no built-in aggregate that merges JSON arrays)
SELECT
  user_id,
  JSON_MERGE_PRESERVE(
    MIN(tags),
    MAX(tags)
  ) AS combined_tags
FROM user_tags
GROUP BY user_id;
```

Note: For more than two rows, consider using a recursive CTE or application-side aggregation.

## JSON_MERGE_PRESERVE() vs JSON_MERGE_PATCH()

```sql
SET @a = '{"tags":["sql","mysql"],"score":10}';
SET @b = '{"tags":["database"],"rank":5}';

-- JSON_MERGE_PRESERVE: arrays concatenated, conflicting scalars wrapped in array
SELECT JSON_MERGE_PRESERVE(@a, @b);
-- {"tags": ["sql", "mysql", "database"], "score": 10, "rank": 5}

-- JSON_MERGE_PATCH: later value replaces earlier one
SELECT JSON_MERGE_PATCH(@a, @b);
-- {"tags": ["database"], "score": 10, "rank": 5}
```

## Practical Example: Building a Changelog

```sql
CREATE TABLE config_changes (
  version INT,
  changes JSON
);

INSERT INTO config_changes VALUES
(1, '{"settings":{"timeout":30}}'),
(2, '{"settings":{"retries":3}}'),
(3, '{"settings":{"timeout":60}}');

-- Cumulative merge of all versions
-- Step by step (or in a loop):
SELECT JSON_MERGE_PRESERVE(
  '{"settings":{"timeout":30}}',
  '{"settings":{"retries":3}}',
  '{"settings":{"timeout":60}}'
) AS merged_config;
-- {"settings": {"timeout": [30, 60], "retries": 3}}
```

## Practical Example: Collecting Multi-Source Tags

```sql
-- Merge tags from product data and from user input
SELECT product_id,
  JSON_MERGE_PRESERVE(system_tags, user_tags) AS all_tags
FROM products;
```

## Deprecation of JSON_MERGE()

```sql
-- JSON_MERGE() is deprecated since MySQL 8.0 - use JSON_MERGE_PRESERVE() instead
SELECT JSON_MERGE('{"a":1}', '{"b":2}');          -- deprecated, still works
SELECT JSON_MERGE_PRESERVE('{"a":1}', '{"b":2}');  -- preferred
```

## Summary

`JSON_MERGE_PRESERVE()` merges JSON documents while keeping all values for conflicting keys by wrapping them in arrays. Use it when you need to combine data from multiple sources without discarding any values. For partial updates where later values should override earlier ones, use `JSON_MERGE_PATCH()` instead. `JSON_MERGE_PRESERVE()` is the non-deprecated replacement for the older `JSON_MERGE()` function.
