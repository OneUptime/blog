# Validation Summary: How to Use ORDER BY with Multiple Columns in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general, 8.0+ for descending index support)
- SQL ORDER BY clause
- MySQL composite indexes
- MySQL EXPLAIN

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement / ORDER BY: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — CREATE INDEX / Descending Indexes: https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that descending index support was introduced in MySQL 8.0. Users on MySQL 5.7 or earlier should be aware that mixed ASC/DESC composite indexes will not avoid filesort.
- Positional ORDER BY references (e.g., `ORDER BY 3 DESC`) are deprecated in the SQL standard and some linters flag them. The post already recommends using column names or aliases instead, which is good advice.
- The `\G` terminator shown in the EXPLAIN example is specific to the mysql command-line client and won't work in GUI tools or application code — but this is a minor usage note, not an error.
