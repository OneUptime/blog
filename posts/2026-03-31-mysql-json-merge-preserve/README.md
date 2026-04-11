# How to Use JSON_MERGE_PRESERVE() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database

Description: Learn how to use MySQL JSON_MERGE_PRESERVE() to merge JSON documents by combining duplicate keys into arrays rather than overwriting them.

---

## What JSON_MERGE_PRESERVE() Does

`JSON_MERGE_PRESERVE()` merges two or more JSON documents and handles duplicate keys by combining their values into an array, rather than overwriting. This contrasts with `JSON_MERGE_PATCH()`, which replaces duplicate keys with the last value.

Merging rules:
- Objects with the same key at the same level have their values combined into an array
- Arrays are concatenated
- Scalars sharing a key are combined into an array
- Non-conflicting keys from all documents are kept

```mermaid
flowchart TD
    A[Document 1\n'{"role":"admin","tags":["a"]}'] --> M[JSON_MERGE_PRESERVE]
    B[Document 2\n'{"role":"editor","tags":["b"]}'] --> M
    M --> C[Result\n'{"role":["admin","editor"],"tags":["a","b"]}']

    subgraph "Conflict resolution"
    D[Scalar + Scalar -> Array]
    E[Array + Array -> Concatenated array]
    F[Object + Object -> Recursive merge]
    end
```

## Syntax

```sql
JSON_MERGE_PRESERVE(json_doc1, json_doc2 [, json_doc3 ...])
```

Documents are merged left to right. The function was named `JSON_MERGE()` before MySQL 8.0.3; that name is deprecated but still works.

## Basic Examples

```sql
-- Scalars with the same key become an array
SELECT JSON_MERGE_PRESERVE(
    '{"role": "admin"}',
    '{"role": "editor"}'
) AS result;
-- {"role": ["admin", "editor"]}

-- Arrays with the same key are concatenated
SELECT JSON_MERGE_PRESERVE(
    '{"tags": ["a", "b"]}',
    '{"tags": ["c", "d"]}'
) AS result;
-- {"tags": ["a", "b", "c", "d"]}

-- Non-conflicting keys are merged freely
SELECT JSON_MERGE_PRESERVE(
    '{"a": 1, "b": 2}',
    '{"c": 3, "d": 4}'
) AS result;
-- {"a": 1, "b": 2, "c": 3, "d": 4}
```

## Setup: Sample Table

```sql
CREATE TABLE event_metadata (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    event    VARCHAR(100),
    meta     JSON
);

INSERT INTO event_metadata (event, meta) VALUES
('login', '{"ip": "10.0.0.1", "tags": ["auth"], "extra": {"region": "us-east"}}'),
('login', '{"ip": "10.0.0.2", "tags": ["auth", "vpn"], "extra": {"region": "eu-west"}}'),
('purchase', '{"amount": 99.99, "tags": ["payment"], "extra": {"method": "card"}}');
```

## Merging Rows into a Single Document

When there are exactly two rows, a self-join works well:

```sql
-- Combine two login event metadata rows using a self-join
SELECT JSON_MERGE_PRESERVE(e1.meta, e2.meta) AS merged
FROM event_metadata e1
JOIN event_metadata e2
    ON e1.event = e2.event AND e1.id < e2.id
WHERE e1.event = 'login';
```

Another approach for exactly two rows uses `MIN` and `MAX`:

```sql
SELECT
    event,
    JSON_MERGE_PRESERVE(
        MIN(meta),
        MAX(meta)
    ) AS combined_meta
FROM event_metadata
WHERE event = 'login'
GROUP BY event;
```

Note that `JSON_MERGE_PRESERVE()` requires at least two arguments, so you cannot dynamically expand aggregated rows into separate arguments within a single SQL call. For merging many rows, collect them at the application layer or use a stored procedure with a loop.

## Object Recursive Merge

When both documents have an object at the same key, the objects are merged recursively:

```sql
SELECT JSON_MERGE_PRESERVE(
    '{"settings": {"theme": "dark",  "lang": "en"}}',
    '{"settings": {"font": "mono",   "lang": "fr"}}'
) AS result;
-- {"settings": {"theme": "dark", "lang": ["en", "fr"], "font": "mono"}}
-- Objects merged recursively; conflicting scalar "lang" became an array
```

## Comparing JSON_MERGE_PRESERVE() with JSON_MERGE_PATCH()

```sql
SET @doc1 = '{"a": 1, "tags": ["x"], "nested": {"k": 1}}';
SET @doc2 = '{"a": 2, "tags": ["y"], "nested": {"k": 2, "m": 9}}';

SELECT
    JSON_MERGE_PRESERVE(@doc1, @doc2) AS preserve_result,
    JSON_MERGE_PATCH(@doc1, @doc2)    AS patch_result;
```

```text
preserve_result:
  {"a": [1, 2], "tags": ["x", "y"], "nested": {"k": [1, 2], "m": 9}}

patch_result:
  {"a": 2, "tags": ["y"], "nested": {"k": 2, "m": 9}}
```

Use `JSON_MERGE_PRESERVE()` when accumulating values (event log aggregation, combining feature sets). Use `JSON_MERGE_PATCH()` when applying an update where later values should replace earlier ones.

## Accumulating Event Tags

```sql
CREATE TABLE user_activity (
    user_id INT,
    tags    JSON
);

INSERT INTO user_activity VALUES
(1, '["login", "viewed_dashboard"]'),
(1, '["clicked_ad", "login"]'),
(2, '["signup", "verified_email"]');
```

Since `JSON_MERGE_PRESERVE()` requires at least two arguments, you cannot wrap a single `JSON_ARRAYAGG()` call with it. Instead, merge explicit array arguments directly:

```sql
SELECT JSON_MERGE_PRESERVE(
    '["login", "viewed_dashboard"]',
    '["clicked_ad", "login"]'
) AS combined_tags;
-- ["login", "viewed_dashboard", "clicked_ad", "login"]
```

## NULL Handling

If any document is `NULL`, the result is `NULL`:

```sql
SELECT JSON_MERGE_PRESERVE('{"a": 1}', NULL);  -- NULL
```

## Merging Three or More Documents

```sql
SELECT JSON_MERGE_PRESERVE(
    '{"a": 1}',
    '{"a": 2}',
    '{"a": 3}',
    '{"b": 10}'
) AS result;
-- {"a": [1, 2, 3], "b": 10}
```

## Summary

`JSON_MERGE_PRESERVE()` merges JSON documents by combining duplicate keys into arrays rather than overwriting them. Arrays at the same key are concatenated and nested objects are merged recursively. It is the right choice when you want to accumulate data across multiple documents, such as combining event logs, merging feature flag sets, or aggregating metadata. For standard partial updates where later values should replace earlier ones, use `JSON_MERGE_PATCH()` instead.
