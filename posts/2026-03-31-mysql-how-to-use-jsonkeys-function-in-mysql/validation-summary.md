# Validation Summary: How to Use JSON_KEYS() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JSON functions: JSON_KEYS, JSON_CONTAINS, JSON_CONTAINS_PATH, JSON_LENGTH, JSON_EXTRACT, JSON_TABLE)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON_KEYS(): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-keys
- MySQL 8.0 Reference Manual — JSON normalization and key ordering: https://dev.mysql.com/doc/refman/8.0/en/json.html#json-normalization

## Issues Found
1. **Incorrect key ordering in result comments**: MySQL normalizes JSON objects by sorting keys — shorter keys first, then lexicographically for same-length keys. Three result comments showed keys in their original input order instead of MySQL's sorted order:
   - `SELECT JSON_KEYS('{"name":"Alice","age":30,"city":"NYC"}')` — changed result from `["name", "age", "city"]` to `["age", "city", "name"]` (age=3 chars, city=4 chars, name=4 chars).
   - `SELECT JSON_KEYS('{"user":{"name":"Alice","age":30}}', '$.user')` — changed result from `["name", "age"]` to `["age", "name"]`.
   - `SELECT JSON_KEYS(@doc, '$.profile')` — changed result from `["name", "age"]` to `["age", "name"]`.

## Review Notes
- The "Counting Keys" section uses `JSON_LENGTH(JSON_KEYS(data))` which is functionally correct but slightly redundant — `JSON_LENGTH(data)` on a JSON object directly returns the number of top-level keys. Since the post is demonstrating JSON_KEYS usage, this is acceptable.
- JSON_TABLE (used in the final example) requires MySQL 8.0.4+. The post does not mention version requirements, but this is a minor omission since JSON_KEYS itself also requires MySQL 5.7+.
