# Validation Summary: How to Use JSON_KEYS() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JSON functions: JSON_KEYS, JSON_CONTAINS, JSON_CONTAINS_PATH, JSON_LENGTH, JSON_UNQUOTE)
- SQL
- JSON

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON_KEYS(): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-keys
- MySQL 8.0 Reference Manual — The JSON Data Type (key normalization/sorting): https://dev.mysql.com/doc/refman/8.0/en/json.html#json-normalization
- MySQL 8.0 Reference Manual — JSON_CONTAINS(): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-contains
- MySQL 8.0 Reference Manual — JSON_CONTAINS_PATH(): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-contains-path
- MySQL 8.0 Reference Manual — JSON_LENGTH(): https://dev.mysql.com/doc/refman/8.0/en/json-attribute-functions.html#function_json-length

## Issues Found

### 1. Incorrect key ordering in "Get Root-Level Keys" output
- **What was wrong:** The output table showed keys in insertion order (e.g., `["timeout", "retries", "tls", "allowed_ips"]` for auth). MySQL normalizes JSON objects by sorting keys alphabetically upon storage, so `JSON_KEYS()` returns keys in sorted order.
- **What was changed:** Corrected all three rows to reflect alphabetical key order:
  - auth: `["allowed_ips", "retries", "timeout", "tls"]`
  - cache: `["db", "host", "password", "port"]`
  - db: `["host", "name", "pool", "port", "ssl"]`
- **Why:** MySQL's JSON normalization sorts object keys lexicographically. The stored representation differs from the insertion literal.

### 2. Incorrect key ordering in "Get Keys of a Nested Object" output
- **What was wrong:** The pool_keys for the 'db' row showed `["min", "max"]`.
- **What was changed:** Corrected to `["max", "min"]` (alphabetical order).
- **Why:** Same reason — MySQL sorts JSON object keys alphabetically during normalization.

## Review Notes
- The "Extracting Key List as a String" section uses `JSON_UNQUOTE(JSON_KEYS(config))`. While this works (JSON_UNQUOTE on a non-string JSON value returns its string representation), `CAST(JSON_KEYS(config) AS CHAR)` would be more semantically appropriate. Not changed since the current code does produce the described output.
- The "Comparing Key Sets Across Rows" section correctly relies on the fact that MySQL normalizes key order, making `=` comparisons on `JSON_KEYS()` results reliable.
- All SQL syntax, function signatures, NULL behavior examples, and alternative approaches (JSON_CONTAINS_PATH) are correct.
