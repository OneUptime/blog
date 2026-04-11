# Validation Summary: How to Use JSON_VALUE() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.21+
- MySQL JSON functions (JSON_VALUE, ->, ->> operators)
- SQL type casting with RETURNING clause
- Generated columns and indexing on JSON paths

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON_VALUE(): https://dev.mysql.com/doc/refman/8.0/en/json-value.html
- MySQL 8.0 Reference Manual — JSON Path Syntax: https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual — JSON Search Functions (-> and ->> operators): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html

## Issues Found

1. **`RETURNING INTEGER` is not a valid type for JSON_VALUE()** (lines 89, 92, 95): The error-handling examples used `RETURNING INTEGER`, but the MySQL documentation only supports `SIGNED` and `UNSIGNED` (optionally followed by `INTEGER`, e.g., `RETURNING SIGNED INTEGER`). Bare `INTEGER` is not a valid RETURNING type. Changed all three occurrences to `RETURNING SIGNED`.

2. **Incorrect `->>` operator result comment** (line 107): The comment `-- Result: "99.99" (string)` incorrectly showed double quotes around the value. The `->>` operator is the unquoting extraction operator — it removes JSON quotes. For a numeric JSON value like `99.99`, the result is `99.99` as a string type but without literal quote characters. Changed to `-- Result: 99.99 (string type, not numeric)`.

## Review Notes
- The supported RETURNING types list omits `YEAR`, which was added in MySQL 8.0.22. This is acceptable since YEAR is rarely used with JSON extraction.
- MySQL also supports using JSON_VALUE() directly in index definitions without a generated column (e.g., `CREATE TABLE t1(j JSON, INDEX i1 ((JSON_VALUE(j, '$.id' RETURNING UNSIGNED))))`). The blog post only demonstrates the generated column approach, which is valid but misses this more concise alternative.
