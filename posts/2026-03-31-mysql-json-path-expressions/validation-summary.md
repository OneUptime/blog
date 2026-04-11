# Validation Summary: How to Use JSON Path Expressions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0+ JSON functions
- JSON path expression syntax (`$`, dot notation, `[n]`, `[last]`, `[m to n]`, `*`, `**`)
- `JSON_EXTRACT()`, `JSON_SET()`, `JSON_REMOVE()`, `JSON_CONTAINS_PATH()`
- Arrow operators `->` and `->>`

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON Path Syntax — https://dev.mysql.com/doc/refman/8.0/en/json-path-syntax.html
- MySQL 8.0 Reference Manual: JSON_EXTRACT() — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-extract
- MySQL 8.0 Reference Manual: The JSON Column Type (arrow operators) — https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0.2 Release Notes (introduction of `last` and range syntax) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-2.html
- MySQL 8.0 Reference Manual: JSON value normalization and key ordering — https://dev.mysql.com/doc/refman/8.0/en/json.html#json-normalization

## Issues Found

### 1. Incorrect version for `$[last]` syntax (Medium)
- **What was wrong:** The post stated `$[last]` was introduced in MySQL 8.0.4+.
- **What was changed:** Corrected to MySQL 8.0.2+. Both `$[last]` and `$[m to n]` range syntax were introduced in MySQL 8.0.2 (WL #9831).
- **Why:** The 8.0.4 release introduced `JSON_TABLE()`, not path syntax enhancements. Readers targeting 8.0.2 or 8.0.3 would incorrectly believe these features are unavailable.

### 2. Arrow operators shown on user-defined variables (Critical)
- **What was wrong:** The post showed `@doc->'$.user.name'` and `@doc->>'$.user.name'`, implying the `->` and `->>` operators work on user-defined variables.
- **What was changed:** Rewrote the Arrow Operator section to clarify that these operators only work on table column references. Added equivalent `JSON_EXTRACT()` and `JSON_UNQUOTE(JSON_EXTRACT())` examples for use with variables.
- **Why:** The MySQL documentation explicitly states the left-hand side must be a column identifier, not an expression. Using a variable like `@doc` would produce a syntax error.

### 3. Wildcard key ordering presented as deterministic (Low-Medium)
- **What was wrong:** `JSON_EXTRACT(@doc, '$.user.address.*')` was shown as returning `["New York", "10001"]` without noting that key order is not guaranteed.
- **What was changed:** Added a comment noting that key order is not guaranteed across releases.
- **Why:** MySQL sorts JSON object keys internally for efficiency, but the documentation warns this ordering is subject to change and not guaranteed to be consistent across releases.

## Review Notes
- The `$[m to n]` range syntax section in the Basic Syntax box does not include a version annotation like `$[last]` does. Both were introduced in MySQL 8.0.2. This is not an error but a minor inconsistency.
- The recursive wildcard `$**.city` syntax and behavior are correctly described. The documentation notes that a path may not end in `**` (a suffix is required), which is satisfied in the example.
- All `JSON_CONTAINS_PATH()`, `JSON_SET()`, and `JSON_REMOVE()` examples are syntactically correct and produce the described results.
