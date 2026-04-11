# How to Use JSON_MERGE_PATCH() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database

Description: Learn how to use MySQL JSON_MERGE_PATCH() to merge JSON documents using RFC 7396 patch semantics, where the second document overwrites and NULLs remove keys.

---

## What JSON_MERGE_PATCH() Does

`JSON_MERGE_PATCH()` merges two or more JSON documents following RFC 7396 (JSON Merge Patch) semantics:

- Keys in the patch document overwrite the same keys in the original
- Keys in the patch set to `null` are removed from the result
- Keys in the original not present in the patch are kept unchanged
- If both values are objects, they are merged recursively
- If either value is not an object, the patch replaces the original

This makes it ideal for partial updates to JSON documents, similar to HTTP PATCH operations.

```mermaid
flowchart TD
    A[Original Document\n'{"a":1,"b":2,"c":3}'] --> M[JSON_MERGE_PATCH]
    B[Patch Document\n'{"b":99,"c":null,"d":4}'] --> M
    M --> C[Result\n'{"a":1,"b":99,"d":4}']

    subgraph Rules
    D["b: overwritten (99)"]
    E["c: removed (set to null in patch)"]
    F["a: kept (not in patch)"]
    G["d: added (new key in patch)"]
    end
```

## Syntax

```sql
JSON_MERGE_PATCH(json_doc1, json_doc2 [, json_doc3 ...])
```

When more than two documents are passed, they are merged left to right sequentially.

## Setup: Sample Table

```sql
CREATE TABLE app_settings (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id  INT,
    settings JSON
);

INSERT INTO app_settings (user_id, settings) VALUES
(1, '{"theme": "light", "lang": "en", "notifications": {"email": true, "sms": false}, "beta": true}'),
(2, '{"theme": "dark",  "lang": "fr", "notifications": {"email": false, "sms": true}}'),
(3, '{"theme": "light", "lang": "es", "notifications": {"email": true, "sms": true}, "debug": true}');
```

## Basic Merge

```sql
SELECT JSON_MERGE_PATCH(
    '{"theme": "light", "lang": "en", "beta": true}',
    '{"theme": "dark", "beta": null}'
) AS result;
-- {"theme": "dark", "lang": "en"}
-- theme: overwritten
-- beta: removed (null in patch)
-- lang: kept (not in patch)
```

## Applying a Patch Update

```sql
-- User 1 wants to switch theme to dark and turn off email notifications
UPDATE app_settings
SET settings = JSON_MERGE_PATCH(
    settings,
    '{"theme": "dark", "notifications": {"email": false}}'
)
WHERE user_id = 1;

SELECT settings FROM app_settings WHERE user_id = 1;
```

```text
{"theme": "dark", "lang": "en", "notifications": {"email": false, "sms": false}, "beta": true}
```

Note: The `notifications` object was merged recursively because both the original and patch values are JSON objects. `sms: false` is preserved because it is absent from the patch. If the patch value were a non-object (e.g., a string or array), it would replace the entire original value instead of merging.

## Removing a Key with null

```sql
-- Remove the 'debug' flag from user 3's settings
UPDATE app_settings
SET settings = JSON_MERGE_PATCH(settings, '{"debug": null}')
WHERE user_id = 3;

SELECT settings ->> '$.debug' AS debug_key FROM app_settings WHERE user_id = 3;
-- NULL (key has been removed)
```

## Merging Multiple Documents Left to Right

```sql
SELECT JSON_MERGE_PATCH(
    '{"a": 1, "b": 2}',
    '{"b": 3, "c": 4}',
    '{"c": 5, "d": 6}'
) AS result;
-- {"a": 1, "b": 3, "c": 5, "d": 6}
-- b: overwritten to 3, then 3 kept (not in third patch)
-- c: overwritten to 4, then to 5
```

## Flattening Nested Objects

When the patch value for a key is a non-object (string, number, array), it completely replaces whatever was at that path, even if the original was a nested object:

```sql
SELECT JSON_MERGE_PATCH(
    '{"config": {"a": 1, "b": 2}}',
    '{"config": "disabled"}'
) AS result;
-- {"config": "disabled"}
-- The entire nested object is replaced by the string
```

## Building a Patch from Column Values

```sql
-- Construct a patch object dynamically and apply it
UPDATE app_settings
SET settings = JSON_MERGE_PATCH(
    settings,
    JSON_OBJECT('lang', 'de', 'theme', 'system')
)
WHERE user_id = 2;
```

## JSON_MERGE_PATCH() vs JSON_MERGE_PRESERVE()

```sql
SELECT
    JSON_MERGE_PATCH(
        '{"a": [1, 2], "b": 1}',
        '{"a": [3, 4], "b": 2}'
    ) AS patch_result,
    JSON_MERGE_PRESERVE(
        '{"a": [1, 2], "b": 1}',
        '{"a": [3, 4], "b": 2}'
    ) AS preserve_result;
```

```text
patch_result:    {"a": [3, 4], "b": 2}   -- second document wins completely
preserve_result: {"a": [1, 2, 3, 4], "b": [1, 2]}  -- arrays and values merged
```

Use `JSON_MERGE_PATCH()` when you want RFC 7396 replace semantics (last writer wins per key). Use `JSON_MERGE_PRESERVE()` when you want arrays and scalar values to be combined rather than replaced.

## Practical Pattern: HTTP PATCH Endpoint

```sql
-- Simulate an HTTP PATCH request that updates only specified fields
-- Input from application: {"theme": "dark", "notifications": {"sms": true}}
SET @patch = '{"theme": "dark", "notifications": {"sms": true}}';

UPDATE app_settings
SET settings = JSON_MERGE_PATCH(settings, @patch)
WHERE user_id = 1;
```

## Summary

`JSON_MERGE_PATCH()` implements RFC 7396 merge semantics: patch keys overwrite original keys, `null` values in the patch remove keys, and keys absent from the patch are preserved. Nested objects are merged recursively. Arrays and scalar values are completely replaced by the patch value, not combined. This makes `JSON_MERGE_PATCH()` the right choice for safe partial JSON updates where the intent is "apply these changes and leave everything else alone."
