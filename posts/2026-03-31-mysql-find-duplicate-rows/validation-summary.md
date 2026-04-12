# Validation Summary: How to Find Duplicate Rows in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (GROUP BY, HAVING, self-joins, window functions, EXPLAIN, indexing, temporary tables)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/select.html)
- MySQL 8.0 Reference Manual: GROUP BY Modifiers (https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html)
- MySQL 8.0 Reference Manual: Window Functions (https://dev.mysql.com/doc/refman/8.0/en/window-functions.html)
- MySQL 8.0 Reference Manual: ROW_NUMBER() (https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_row-number)
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/create-index.html)
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: CREATE TEMPORARY TABLE (https://dev.mysql.com/doc/refman/8.0/en/create-temporary-table.html)

## Issues Found
- **Code fence language label on EXPLAIN query**: The `EXPLAIN` SQL statement was inside a ` ```bash ` code block, but it is SQL executed within a MySQL session, not a shell command. Changed to ` ```sql ` for correct syntax highlighting and to avoid confusing readers into thinking it is a bash command.

## Review Notes
- The `ROW_NUMBER()` window function requires MySQL 8.0 or later. MySQL 5.7 and earlier do not support window functions. The post does not mention this version requirement. This is not incorrect but could be clarified in a future update for readers on older MySQL versions.
- All SQL queries are syntactically correct and logically sound for their described purposes.
- The `SUM(occurrence_count - 1)` logic for counting total duplicates is correct (it counts excess rows beyond the first occurrence).
- The self-join pattern for retrieving full duplicate rows is a well-established and correct approach.
