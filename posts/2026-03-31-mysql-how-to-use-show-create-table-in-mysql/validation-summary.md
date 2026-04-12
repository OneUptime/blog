# Validation Summary: How to Use SHOW CREATE TABLE in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (SHOW CREATE TABLE, SHOW CREATE VIEW, SHOW CREATE PROCEDURE, SHOW CREATE FUNCTION, SHOW CREATE TRIGGER, SHOW CREATE EVENT)
- MySQL CLI client (`mysql`, `mysqldump`)
- Python (`mysql.connector` / mysql-connector-python)
- information_schema system tables

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/show-create-table.html
- MySQL 8.0 Reference Manual: String Literals and Escape Sequences — https://dev.mysql.com/doc/refman/8.0/en/string-literals.html
- MySQL 8.0 Reference Manual: mysql Client Commands (statement terminators `\G` and `;`) — https://dev.mysql.com/doc/refman/8.0/en/mysql-commands.html
- MySQL 8.0 Reference Manual: mysqldump --no-data — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: information_schema.tables — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- mysql-connector-python documentation — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
1. **Broken bash command for schema documentation export** (lines 53-56):
   - **Missing `-N` flag:** The first `mysql` invocation lacked the `-N` (or `--skip-column-names`) flag. Without it, the column header from the SELECT result (e.g., the literal text `CONCAT(...)`) gets piped to the second `mysql` client as SQL, causing a syntax error.
   - **Broken `\\G` escaping:** In a bash double-quoted string, `\\G` is processed by bash into `\G`. MySQL then interprets `\G` inside a string literal as an unrecognized escape sequence, collapsing it to just `G`. The resulting output would be `SHOW CREATE TABLE ordersG` — not a valid statement. Replaced `'\\G'` with `';'` which is a proper statement terminator and avoids the double-escaping problem entirely.
   - **Fix applied:** Added `-N` flag and changed `'\\G'` to `';'`.

## Review Notes
- The piped-mysql approach for schema export still produces tab-separated output (table name + DDL per line), not a clean SQL file. The `mysqldump --no-data` alternative shown immediately after is the recommended approach for clean DDL export. The piped approach is adequate as a demonstration technique.
- The Python example does not use context managers or `cursor.close()`, which is a style/best-practice concern rather than a correctness issue.
- All other technical claims, SQL syntax, example output, comparison table, and SHOW CREATE commands for other object types are accurate.
