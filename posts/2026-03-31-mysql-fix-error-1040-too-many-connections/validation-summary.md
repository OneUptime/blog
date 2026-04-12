# Validation Summary: How to Fix ERROR 1040 Too Many Connections in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (server status variables, global variables, information_schema, performance_schema)
- ProxySQL (connection pooling proxy)
- HikariCP / Spring Boot (application-level connection pooling)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables (`max_connections`, `wait_timeout`, `interactive_timeout`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — Server Status Variables (`Threads_connected`, `Max_used_connections`, `Connection_errors_max_connections`): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — SHOW PROCESSLIST / information_schema.PROCESSLIST: https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual — KILL Statement: https://dev.mysql.com/doc/refman/8.0/en/kill.html
- ProxySQL Documentation — mysql_servers table: https://proxysql.com/documentation/main-runtime/#mysql_servers
- Spring Boot / HikariCP configuration properties: https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby

## Issues Found
1. **ProxySQL configuration used a non-existent table.** The post referenced `mysql_connection_pool` with columns `hostgroup_id`, `max_connections`, and `max_replication_lag`, but this table does not exist in ProxySQL. The correct table for configuring backend servers and their connection limits is `mysql_servers`. Additionally, the LOAD/SAVE commands used `MYSQL VARIABLES` which applies to global variable changes, not server configuration. Fixed the example to use `INSERT INTO mysql_servers (hostgroup_id, hostname, port, max_connections) VALUES (0, '127.0.0.1', 3306, 100)` with the correct `LOAD MYSQL SERVERS TO RUNTIME` and `SAVE MYSQL SERVERS TO DISK` commands. Also changed the code fence language from `ini` to `sql` since the block contains SQL statements.

## Review Notes
- The memory sizing formula `max_connections = RAM_MB / 2` is a very rough heuristic. The per-thread memory usage depends heavily on session buffer settings (`sort_buffer_size`, `read_buffer_size`, `join_buffer_size`, etc.) and can exceed 2 MB under certain workloads. The post already provides the more accurate formula above it, so this is acceptable as a quick approximation.
- The `information_schema.PROCESSLIST` table is deprecated as of MySQL 8.0.22 in favor of `performance_schema.processlist`. The post's usage is still functional but may warrant updating in the future.
- The `performance_schema.global_status` query is correct for MySQL 5.7.6+. On older MySQL versions, `SHOW GLOBAL STATUS` would be needed instead.
