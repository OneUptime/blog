# Validation Summary: How to Kill a Long-Running Query in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SHOW PROCESSLIST, KILL command, information_schema, performance_schema)
- mysqladmin CLI tool
- MySQL stored procedures (cursors, handlers)
- MySQL privilege system (CONNECTION_ADMIN, SUPER)

## Sources Consulted
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual: information_schema.processlist — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: performance_schema.threads — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: performance_schema.events_statements_current — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-statements-current-table.html
- MySQL 8.0 Reference Manual: Privileges — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual: mysqladmin — https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- MySQL 8.0 Reference Manual: Cursors — https://dev.mysql.com/doc/refman/8.0/en/cursors.html

## Issues Found
No technical issues found.

## Review Notes
- The stored procedure declares `proc_id` as `BIGINT` (signed) while `information_schema.processlist.id` is `BIGINT UNSIGNED`. This is not a practical issue since process IDs won't exceed the signed BIGINT range, but could be noted for completeness.
- The post does not mention the `PROCESS` privilege needed to view other users' threads in `SHOW PROCESSLIST` or `information_schema.processlist`. This is an omission rather than an error, since the post focuses on killing queries, not viewing them.
- `SHOW PROCESSLIST` is noted as deprecated in MySQL 8.0.22+ in favor of querying `performance_schema.processlist`, but remains functional. The post already covers the `performance_schema` approach as an alternative.
