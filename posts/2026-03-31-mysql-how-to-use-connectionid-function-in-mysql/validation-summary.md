# Validation Summary: How to Use CONNECTION_ID() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (CONNECTION_ID() function)
- MySQL information_schema.processlist
- MySQL performance_schema.threads
- MySQL GET_LOCK / RELEASE_LOCK
- MySQL KILL QUERY / KILL CONNECTION
- Python (DB-API 2.0)
- Node.js (mysql2/promise)

## Sources Consulted
- MySQL 8.0 Reference Manual: CONNECTION_ID() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_connection-id
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual: GET_LOCK() — https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html
- MySQL 8.0 Reference Manual: The information_schema PROCESSLIST Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: The performance_schema threads Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: User-Defined Variables — https://dev.mysql.com/doc/refman/8.0/en/user-variables.html

## Issues Found
1. **Misleading user variable across sessions**: The "dynamic approach" section used `SET @conn = CONNECTION_ID();` and then commented `-- In another session: KILL QUERY @conn;`. User variables in MySQL are session-scoped and cannot be accessed from another session, making this suggestion incorrect. Fixed by replacing with a simpler example that retrieves the connection ID via `SELECT CONNECTION_ID()` and notes to use the numeric value directly in another session.

## Review Notes
- The `GET_LOCK` example using `CONNECTION_ID()` in the lock name is technically correct, but worth noting that per-connection unique lock names mean no two connections will ever contend for the same lock. This is valid for preventing re-entrant execution within the same connection, but the more common GET_LOCK pattern uses a shared name across connections for mutual exclusion.
- The `information_schema.processlist` table is deprecated as of MySQL 8.0.22 in favor of `performance_schema.processlist`. The post covers both information_schema and performance_schema approaches, so this is adequately handled.
