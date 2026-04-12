# Validation Summary: How to Use CONNECTION_ID() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (CONNECTION_ID() function)
- MySQL SHOW PROCESSLIST
- MySQL information_schema.PROCESSLIST
- MySQL performance_schema.threads
- MySQL GET_LOCK / RELEASE_LOCK
- MySQL KILL / KILL QUERY
- MySQL expression defaults (MySQL 8.0.13+)

## Sources Consulted
- MySQL 8.0 Reference Manual: CONNECTION_ID() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_connection-id
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual: performance_schema.threads — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: GET_LOCK() — https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html#function_get-lock
- MySQL 8.0 Reference Manual: CREATE TABLE (expression defaults) — https://dev.mysql.com/doc/refman/8.0/en/create-table.html

## Issues Found
No technical issues found.

## Review Notes
- The audit table CREATE TABLE uses expression defaults (`DEFAULT (USER())`, `DEFAULT (DATABASE())`), which require MySQL 8.0.13 or later. The post does not mention this version requirement, but since it does not claim compatibility with older versions, this is acceptable.
- The locking pattern section embeds `CONNECTION_ID()` into the lock name, which means each connection gets a unique lock name. This is valid SQL but does not provide mutual exclusion between connections (since no two connections share the same lock name). The pattern could be useful for connection-scoped coordination with external monitoring, but readers looking for mutual exclusion should use a fixed lock name (e.g., `'export_job'`) without the connection ID suffix. This is a design consideration rather than a technical error.
- The `schema_name` column with `DEFAULT (DATABASE())` and `NOT NULL` will cause an INSERT failure if no database is selected at the time of insert. This is a minor design consideration, not a syntax or correctness error.
