# Validation Summary: How to Use JSON_STORAGE_SIZE() and JSON_STORAGE_FREE() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7.22+ for JSON_STORAGE_SIZE, 8.0+ for JSON_STORAGE_FREE)
- MySQL JSON binary storage format
- MySQL JSON utility functions (JSON_STORAGE_SIZE, JSON_STORAGE_FREE)
- MySQL JSON manipulation functions (JSON_SET, JSON_REPLACE, JSON_REMOVE)
- InnoDB in-place partial updates

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON Utility Functions: https://dev.mysql.com/doc/refman/8.0/en/json-utility-functions.html
- MySQL 8.0 Reference Manual — The JSON Data Type (Partial Updates): https://dev.mysql.com/doc/refman/8.0/en/json.html#json-partial-updates
- MySQL Server Blog — New JSON functions in MySQL 5.7.22
- MySQL Worklog WL#9192 (JSON_STORAGE_SIZE and JSON_STORAGE_FREE specification)

## Issues Found

1. **Dead `SET @doc` variable**: The line `SET @doc = CAST('{"name": "Alice", "score": 100}' AS JSON);` declared a user variable that was never referenced in subsequent statements. The UPDATE operated on the `documents` table column, not `@doc`. Removed the unused line.

2. **Incorrect JSON_STORAGE_FREE() example**: The `documents` table row for `id = 1` contained `{"title": "Article One", "tags": ["mysql", "json"]}`, which has no `$.score` path. The UPDATE `JSON_SET(data, '$.score', 5)` would add a new key rather than replacing an existing value with a shorter one, so it would not produce free space from a partial update. Changed the example to replace `$.title` with a shorter string (`'A1'`), which correctly demonstrates in-place shrinkage and non-zero `JSON_STORAGE_FREE()`.

## Review Notes
- `JSON_STORAGE_SIZE()` was introduced in MySQL 5.7.22, while `JSON_STORAGE_FREE()` was introduced in MySQL 8.0. The post does not mention version requirements, which could be useful context for readers on older MySQL versions.
- The exact byte counts in the examples (e.g., 40 for `'{"name": "Alice", "age": 30}'`, 2 for `'[]'`) are plausible given MySQL's binary JSON format overhead but were not verified on a live instance. They may vary slightly across MySQL versions.
- The claim that `JSON_STORAGE_FREE()` is "only meaningful for columns stored in InnoDB" is a reasonable inference (since InnoDB is the engine that supports in-place partial updates), but the official documentation does not explicitly restrict it to InnoDB.
- The `CAST(doc AS JSON)` reclamation technique is logically sound (forces a full rewrite) but is not prescribed in the official MySQL documentation.
