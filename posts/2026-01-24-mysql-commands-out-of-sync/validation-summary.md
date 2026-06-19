# Validation Summary: How to Fix 'Commands Out of Sync' Errors in MySQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MySQL
- PHP mysqli
- PHP PDO
- Python mysql-connector
- SQLAlchemy
- Node.js mysql2
- Connection pooling

## Sources Consulted
- MySQL 8.0 Reference Manual: Commands out of sync: https://dev.mysql.com/doc/refman/8.0/en/commands-out-of-sync.html
- MySQL C API: Multiple Statement Execution Support: https://dev.mysql.com/doc/c-api/8.4/en/c-api-multiple-queries.html
- PHP manual: mysqli::store_result: https://www.php.net/manual/en/mysqli.store-result.php
- PHP manual: mysqli::multi_query: https://www.php.net/manual/en/mysqli.multi-query.php
- PHP manual: mysqli::next_result: https://www.php.net/manual/en/mysqli.next-result.php
- PHP manual: mysqli stored procedures quickstart: https://www.php.net/manual/en/mysqli.quickstart.stored-procedures.php
- PHP manual: PDOStatement::closeCursor: https://www.php.net/manual/en/pdostatement.closecursor.php
- MySQL Connector/Python: buffered cursors: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursorbuffered.html
- MySQL Connector/Python: MySQLConnection.cursor buffered argument: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlconnection-cursor.html
- MySQL Connector/Python: MySQLCursor.nextset: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-nextset.html
- MySQL Connector/Python: MySQLCursor.fetchsets and multi-statement workflow: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-fetchsets.html
- MySQL Connector/Python: MySQLCursor.stored_results deprecation: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-stored-results.html
- mysql2 documentation: https://sidorares.github.io/node-mysql2/docs
- SQLAlchemy documentation: Working with Engines and Connections: https://docs.sqlalchemy.org/en/latest/core/connections.html
- SQLAlchemy documentation: Connection Pooling: https://docs.sqlalchemy.org/en/latest/core/pooling.html
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST: https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html

## Issues Found
- The introductory explanation and diagram implied returned rows always sit in a buffer. Updated the wording to describe the more general pending-result state, because buffering depends on the client API and cursor mode.
- The mysqli problem example used `mysqli::query()` without `MYSQLI_USE_RESULT`, which defaults to a buffered result and would not reliably demonstrate the error. Changed it to an unbuffered query.
- The mysqli `store_result()` comment described it as a fix for an already unbuffered query. Clarified that `store_result()` buffers results after `real_query()`.
- The Python stored procedure example used `cursor.stored_results()`, which official Connector/Python documentation marks deprecated as of 9.3.0. Replaced it with `cursor.execute("CALL ...")` plus `fetchall()` and `nextset()`.
- The Node.js streaming example used the promise wrapper's underlying connection internals. Replaced it with the documented callback-style mysql2 connection for streaming while keeping promise queries for normal buffered execution.
- The Node.js stored procedure example said `multipleStatements` is required for procedures. Removed that option because a single `CALL ...` statement does not require semicolon-delimited multi-statement support.
- The mysql2 debugging snippet used packet-name filtering that is not documented for mysql2. Changed it to `debug: true`.

## Review Notes
The remaining examples are illustrative and omit production concerns such as schema setup, error handling, credential management, and cleanup after failed demonstration queries. Those omissions are acceptable for this troubleshooting guide, but complete runnable samples would need separate connections or isolated setup for each scenario.
