# Validation Summary: How to View Active Connections with SHOW PROCESSLIST in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (SHOW PROCESSLIST, SHOW FULL PROCESSLIST)
- information_schema.processlist
- performance_schema.processlist (MySQL 8.0.22+)
- KILL / KILL QUERY statements
- Bash scripting for automated query killing

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST Statement — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual: information_schema.processlist — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: performance_schema.processlist — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-processlist-table.html
- MySQL 8.0 Reference Manual: performance_schema.threads — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: Thread Command Values — https://dev.mysql.com/doc/refman/8.0/en/thread-commands.html
- MySQL 8.0 Reference Manual: General Thread States — https://dev.mysql.com/doc/refman/8.0/en/general-thread-states.html
- mysql client options — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html

## Issues Found

1. **`Binlog` in sample output should be `Binlog Dump`**: The sample SHOW PROCESSLIST output showed the Command column value as `Binlog` for a replication thread. The correct MySQL command type is `Binlog Dump`. Fixed the sample output.

2. **`Sleep` incorrectly listed as a State value**: The "Common State Values" table listed `Sleep` as a state meaning "Idle connection, no query running." However, `Sleep` is a `Command` value, not a `State` value. A sleeping connection has an empty or NULL state. Removed the `Sleep` row from the State values table.

3. **Wrong column names for `performance_schema.processlist`**: The query for `performance_schema.processlist` used column names like `processlist_id`, `processlist_user`, `processlist_host`, etc. These are column names from `performance_schema.threads`, not `performance_schema.processlist`. The `performance_schema.processlist` table (added in MySQL 8.0.22) uses the same column names as `information_schema.processlist`: `ID`, `USER`, `HOST`, `DB`, `COMMAND`, `TIME`, `STATE`, `INFO`. Fixed the query to use correct column names.

4. **Automated kill script missing `--skip-column-names` flag**: The bash script piped the output of a SELECT statement directly into another `mysql` client. Without the `-N` (`--skip-column-names`) flag, the column header row (e.g., `CONCAT('KILL ', id, ';')`) would be piped as a SQL statement, causing a syntax error. Added the `-N` flag to the first `mysql` invocation.

## Review Notes
- The `Sending data` state mentioned in the Common State Values table was replaced by more specific states in MySQL 8.0.17+. It remains valid for MySQL 5.7 and earlier 8.0 versions. Since the post does not target a specific MySQL version, this is acceptable but worth noting.
- The `Waiting for lock` state listed in the table is a simplification. MySQL uses more specific state strings like `Waiting for table metadata lock`, `Waiting for table level lock`, etc. As a general reference this is acceptable, but readers should be aware the exact state strings will be more specific.
- The `SHOW PROCESSLIST` statement is deprecated as of MySQL 8.0.22 in favor of querying `performance_schema.processlist`. The post does mention the performance_schema alternative but does not note the deprecation.
