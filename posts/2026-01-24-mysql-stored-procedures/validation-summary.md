# Validation Summary: How to Handle Stored Procedures in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL stored procedures
- MySQL SQL/PSM syntax
- MySQL cursors and condition handlers
- MySQL privileges and routine security
- MySQL Connector/Python
- Node.js mysql2

## Sources Consulted
- MySQL 8.4 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements - https://dev.mysql.com/doc/refman/8.4/en/create-procedure.html
- MySQL 8.4 Reference Manual: CALL Statement - https://dev.mysql.com/doc/refman/8.4/en/call.html
- MySQL 8.4 Reference Manual: Caching of Prepared Statements and Stored Programs - https://dev.mysql.com/doc/refman/8.4/en/statement-caching.html
- MySQL 8.4 Reference Manual: Variables in Stored Programs - https://dev.mysql.com/doc/refman/8.4/en/stored-program-variables.html
- MySQL 8.4 Reference Manual: SELECT ... INTO Statement - https://dev.mysql.com/doc/refman/8.4/en/select-into.html
- MySQL 8.4 Reference Manual: Cursors - https://dev.mysql.com/doc/refman/8.4/en/cursors.html
- MySQL 8.4 Reference Manual: ALTER PROCEDURE Statement - https://dev.mysql.com/doc/refman/8.4/en/alter-procedure.html
- MySQL 8.4 Reference Manual: Stored Object Access Control - https://dev.mysql.com/doc/refman/8.4/en/stored-objects-security.html
- MySQL Connector/Python Developer Guide: MySQLCursor.callproc() - https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-callproc.html
- MySQL Connector/Python Developer Guide: MySQLCursor.stored_results() - https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-stored-results.html
- MySQL Connector/Python Developer Guide: MySQLCursor.fetchsets() - https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-fetchsets.html
- mysql2 Quickstart - https://sidorares.github.io/node-mysql2/docs

## Issues Found
- The post described MySQL stored procedures as "precompiled" and said procedures are parsed and compiled once. MySQL documentation describes per-session conversion and caching of stored program bodies, with automatic reparsing when referenced metadata changes. Updated the introduction, diagram, and performance bullet to avoid overstating precompilation behavior.
- The parameter examples called `IN` parameters read-only and `OUT` parameters write-only. MySQL permits modifying an `IN` parameter inside the procedure, but the change is not visible to the caller; `OUT` parameters start as `NULL` and are returned to the caller. Updated the comments accordingly.
- `CalculateOrderTotal` used `SUM(...)` directly, which returns `NULL` when no matching rows exist. Wrapped the aggregate with `COALESCE(..., 0)` so the example preserves the intended default subtotal.
- The cursor example selected unqualified `id` from a join where both joined tables commonly have an `id` column. Qualified it as `s.id` and `u.email` to avoid ambiguous-column errors.
- The cursor example returned `ROW_COUNT()` after the loop, which would report the last statement's affected rows rather than the total number of subscriptions processed. Added a local counter and returned it.
- The Python result-set example used `cursor.stored_results()`, which is deprecated as of MySQL Connector/Python 9.3.0. Replaced it with `CALL` via `execute()`, `fetchall()`, and `nextset()` consumption. Also changed the OUT-parameter example to use the modified argument list returned by `callproc()`, as documented.
- The Node.js mysql2 result-set example logged the first result set array rather than the first user row. Changed it to log `results[0][0]`.

## Review Notes
The examples remain schema-dependent and illustrative; they assume tables and columns such as `users`, `orders`, `subscriptions`, and `accounts` already exist. The `TransferFunds` example is syntactically valid, but a production implementation should also validate positive transfer amounts and confirm the destination account update affected a row.
