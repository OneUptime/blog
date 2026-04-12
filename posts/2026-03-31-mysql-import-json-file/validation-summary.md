# Validation Summary: How to Import a JSON File into MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JSON column type, JSON_EXTRACT, JSON_UNQUOTE functions)
- Python (json module, mysql-connector-python)
- jq (command-line JSON processor)
- NDJSON (Newline-Delimited JSON format)

## Sources Consulted
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — JSON Functions: https://dev.mysql.com/doc/refman/8.0/en/json-functions.html
- MySQL 8.0 Reference Manual — The JSON Data Type: https://dev.mysql.com/doc/refman/8.0/en/json.html
- mysql-connector-python documentation: https://dev.mysql.com/doc/connector-python/en/
- jq Manual: https://jqlang.github.io/jq/manual/

## Issues Found
1. **Deprecated `VALUES()` in `ON DUPLICATE KEY UPDATE`**: The original code used `ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), age=VALUES(age)`. The `VALUES()` function in this context was deprecated in MySQL 8.0.20 and is subject to removal in a future version. Updated to use the row alias syntax: `... VALUES (...) AS new ON DUPLICATE KEY UPDATE name=new.name, email=new.email, age=new.age`, which is the recommended approach since MySQL 8.0.20.

## Review Notes
- The `jq` conversion example uses double quotes for SQL string values (e.g., `"Alice"` instead of `'Alice'`). MySQL accepts double-quoted strings in its default SQL mode, so this works, but it would fail if `ANSI_QUOTES` SQL mode is enabled. Additionally, the `jq` approach does not escape special characters in string values, so it could produce broken SQL if the data contains quotes or other special characters. This is acceptable for a quick demo with known-clean data, but production use should prefer parameterized queries (as shown in the Python examples).
- The `cursor.rowcount` after `executemany` with `ON DUPLICATE KEY UPDATE` may report a surprising number — MySQL counts updated rows as 2 affected rows. This is MySQL behavior, not a bug in the code, but could confuse readers.
- All Python examples correctly use parameterized queries, which is good practice for SQL injection prevention.
- The JSON column examples (JSON_EXTRACT, JSON_UNQUOTE) are correct. The shorthand operators `->` and `->>` could also be used but are not required.
