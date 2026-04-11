# Validation Summary: How to Configure MySQL max_connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+ (max_connections, connection management, per-user limits)
- performance_schema and information_schema
- ProxySQL (connection pooling)
- systemd (service management)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — max_connections (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_connections)
- MySQL 8.0 Reference Manual: Server Status Variables — Threads_connected, Max_used_connections, Connection_errors_max_connections (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: CONNECTION_ADMIN privilege (https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html#priv_connection-admin)
- MySQL 8.0 Reference Manual: ALTER USER — MAX_USER_CONNECTIONS (https://dev.mysql.com/doc/refman/8.0/en/alter-user.html)
- MySQL 8.0 Reference Manual: KILL Statement (https://dev.mysql.com/doc/refman/8.0/en/kill.html)
- MySQL 8.0 Reference Manual: wait_timeout, interactive_timeout (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_wait_timeout)

## Issues Found
- **PgBouncer reference in MySQL article**: The connection pooling section mentioned "ProxySQL or PgBouncer-equivalent on each app server." PgBouncer is a PostgreSQL-specific connection pooler and does not support MySQL. While the text used "equivalent" as an analogy, it is confusing in a MySQL-focused article and could mislead readers into thinking PgBouncer works with MySQL. Changed to "ProxySQL or application-side connection pooling" which is accurate and MySQL-relevant.

## Review Notes
- The per-connection memory estimate is presented as a rough approximation, which is appropriate. In practice, buffers like `join_buffer_size` and `sort_buffer_size` are allocated per-operation rather than per-connection, so actual memory usage per connection varies with workload. The post correctly qualifies this with "Rough per-connection memory estimate."
- The memory calculation example (32 GB server) does not explicitly subtract `innodb_log_buffer_size` and `key_buffer_size` as shown in the formula, but these are small defaults (~16 MB and ~8 MB respectively) and are implicitly covered by the "~300 MB global overheads" approximation. This is acceptable given the "~" qualifier throughout.
- The `CONNECTION_ADMIN` privilege is MySQL 8.0+. In MySQL 5.7 and earlier, the equivalent was the `SUPER` privilege. The post doesn't specify a version, but since MySQL 8.0 is the current major version, this is appropriate.
- All SQL queries, configuration snippets, and CLI commands are syntactically correct and would work on a standard MySQL 8.0+ installation.
