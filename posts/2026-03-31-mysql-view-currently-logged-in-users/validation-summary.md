# Validation Summary: How to View Currently Logged In Users in MySQL

## Status
validated

## Post Type
Reference / How-to Guide

## Technologies Covered
- MySQL (SHOW PROCESSLIST, SHOW FULL PROCESSLIST, KILL CONNECTION, KILL QUERY, SHOW STATUS)
- information_schema.PROCESSLIST
- performance_schema.threads
- performance_schema.global_status

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST Statement — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual: The information_schema PROCESSLIST Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: The performance_schema threads Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: Server Status Variables (Threads_connected) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: The performance_schema global_status Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html

## Issues Found
No technical issues found.

## Review Notes
- The sample SHOW PROCESSLIST output uses "Sending" as a State value, which is a slight abbreviation of the actual MySQL thread state "Sending data" (MySQL 5.7 and earlier). In MySQL 8.0.17+, this state was replaced with more specific states like "Sending to client" and "Executing". Since this is clearly illustrative sample output, it does not constitute a technical error.
- The post covers MySQL 8.0-compatible syntax throughout. The `performance_schema.global_status` query is correct for MySQL 5.7.6+ where status variables moved from `information_schema` to `performance_schema`.
- In MySQL 8.0.22+, `SHOW PROCESSLIST` was reimplemented to use `performance_schema.processlist` instead of the thread manager mutex, improving performance. The post could mention this in a future update but the current content remains correct.
