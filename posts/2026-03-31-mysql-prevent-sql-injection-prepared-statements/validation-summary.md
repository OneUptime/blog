# Validation Summary: How to Prevent SQL Injection Using Prepared Statements in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (PREPARE / EXECUTE / DEALLOCATE PREPARE)
- PHP PDO (ATTR_EMULATE_PREPARES, server-side prepared statements)
- Python mysql-connector-python (parameterized queries with %s)
- Node.js mysql2/promise (conn.execute with ? placeholders)
- Java JDBC (PreparedStatement)

## Sources Consulted
- MySQL 8.0 Reference Manual — PREPARE statement: https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL 8.0 Reference Manual — EXECUTE statement: https://dev.mysql.com/doc/refman/8.0/en/execute.html
- MySQL 8.0 Reference Manual — String Literals and escape sequences: https://dev.mysql.com/doc/refman/8.0/en/string-literals.html
- PHP Manual — PDO::ATTR_EMULATE_PREPARES: https://www.php.net/manual/en/pdo.setattribute.php
- mysql-connector-python documentation — Cursor.execute(): https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-execute.html
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2
- Java SE — PreparedStatement API: https://docs.oracle.com/javase/8/docs/api/java/sql/PreparedStatement.html

## Issues Found
No technical issues found.

## Review Notes
- The allowlist example in "What Prepared Statements Cannot Protect" uses `IF`/`SIGNAL`/`END IF` and a bare variable name (`user_supplied_table` without `@` prefix), which are MySQL stored procedure constructs. These would only work inside a `BEGIN...END` block of a stored procedure, not in a regular SQL session. This is not technically wrong (the implied context is a stored procedure), but a brief note mentioning that could help readers unfamiliar with MySQL stored procedures.
- The Python `mysql-connector-python` example uses client-side parameterization by default (not server-side prepared statements). The comment correctly labels it "Safe parameterized query" rather than claiming it uses server-side prepared statements. For true server-side prepared statements with this driver, `conn.cursor(prepared=True)` would be needed. The current approach is still safe against SQL injection.
- All code examples are syntactically correct and use current, non-deprecated APIs.
