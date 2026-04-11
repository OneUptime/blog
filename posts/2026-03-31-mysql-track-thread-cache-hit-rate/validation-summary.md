# Validation Summary: How to Track MySQL Thread Cache Hit Rate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (thread cache, performance_schema, global status variables)
- Bash (mysql CLI scripting)
- Prometheus / mysqld_exporter (monitoring)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Status Variables (Threads_created, Connections, Threads_cached, Threads_connected, Threads_running) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: Server System Variables (thread_cache_size) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_thread_cache_size
- MySQL 8.0 Reference Manual: performance_schema.global_status table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual: mysql Client Options (-s, -e flags) — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- Prometheus mysqld_exporter documentation — https://github.com/prometheus/mysqld_exporter

## Issues Found
No technical issues found.

## Review Notes
- The hit rate SQL query relies on MySQL's implicit VARCHAR-to-number conversion for arithmetic on `VARIABLE_VALUE`. This works correctly but an explicit `CAST()` could improve clarity in production monitoring scripts.
- The "10% of max_connections" rule of thumb for `thread_cache_size` is a common community guideline. MySQL 8.0's own default formula (`8 + max_connections / 100`) is more conservative. Both approaches are valid; the post's recommendation errs on the generous side, which is reasonable for busy servers.
- The post does not specify a MySQL version. All content is accurate for MySQL 8.0, which is the current GA release series. The `performance_schema.global_status` table is the correct modern approach (the older `SHOW GLOBAL STATUS` method also works but `performance_schema` is preferred).
