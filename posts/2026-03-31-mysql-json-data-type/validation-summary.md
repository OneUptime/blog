# Validation Summary: How to Use JSON Data Type in MySQL 5.7+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7+ / 8.0+
- SQL (DDL and DML)
- MySQL JSON data type and JSON functions
- Generated (virtual) columns for indexing JSON paths

## Sources Consulted
- MySQL 5.7 Reference Manual — The JSON Data Type: https://dev.mysql.com/doc/refman/5.7/en/json.html
- MySQL 5.7 Reference Manual — JSON Function Reference: https://dev.mysql.com/doc/refman/5.7/en/json-function-reference.html
- MySQL 5.7 Reference Manual — JSON Path Syntax: https://dev.mysql.com/doc/refman/5.7/en/json-path-syntax.html
- MySQL 8.0 Reference Manual — Data Type Default Values (expression defaults): https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — CREATE TABLE and Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL Internal JSON Binary Format (WL#8132): https://dev.mysql.com/worklog/task/?id=8132

## Issues Found

### 1. Mermaid diagram described MySQL's binary JSON format as "BSON-like"
- **What was wrong:** The flowchart node read "Stored as binary BSON-like format." BSON is MongoDB's binary serialization format. MySQL uses its own proprietary optimized binary format for JSON storage, which is unrelated to BSON.
- **What was changed:** Updated the node text from "Stored as binary BSON-like format" to "Stored as optimized binary format."
- **Why:** The term "BSON-like" is technically inaccurate and could confuse readers into thinking MySQL uses MongoDB's serialization format. MySQL's documentation describes its JSON storage as an "optimized binary format that permits quick read access to document elements."

### 2. Expression default `DEFAULT (JSON_OBJECT())` incompatible with MySQL 5.7
- **What was wrong:** The `user_preferences` table used `JSON NOT NULL DEFAULT (JSON_OBJECT())`. Parenthesized expression defaults (`DEFAULT (expr)`) were introduced in MySQL 8.0.13. This syntax will produce a syntax error on any MySQL 5.7 installation, contradicting the post's "MySQL 5.7+" title.
- **What was changed:** Removed the `DEFAULT (JSON_OBJECT())` clause, changing the column to `JSON NOT NULL`. The INSERT statements in the example already provide explicit JSON values, so the default was never exercised.
- **Why:** Ensures the complete working example actually runs on MySQL 5.7 as the post title promises.

## Review Notes
- The `->>` (inline path) operator was introduced in MySQL 5.7.13, not in the initial 5.7.0 release. This is unlikely to affect readers since most 5.7 installations are at later patch levels, but it is a minor version-specific caveat.
- `JSON_PRETTY()` was added in MySQL 5.7.22. The post uses it in the utility functions section without noting the minimum version. Again, unlikely to affect most readers.
- All SQL syntax, JSON path expressions, JSON functions (`JSON_EXTRACT`, `JSON_SET`, `JSON_REMOVE`, `JSON_ARRAY_APPEND`, `JSON_CONTAINS`, `JSON_VALID`, `JSON_PRETTY`, `JSON_LENGTH`, `JSON_KEYS`), and expected output are correct.
- The generated virtual column with index approach is correct for InnoDB in MySQL 5.7.8+.
- Best practices section is sound and accurate.
