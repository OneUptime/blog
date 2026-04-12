# Validation Summary: How to Configure MySQL Thread Pool Plugin

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL Enterprise Edition (Thread Pool plugin)
- Percona Server for MySQL (built-in thread pool)
- MariaDB (mentioned as alternative distribution)

## Sources Consulted
- MySQL 8.0 Reference Manual — Thread Pool Installation: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-installation.html
- MySQL 8.0 Reference Manual — Thread Pool Elements: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-elements.html
- MySQL 8.0 Reference Manual — Thread Pool Operation: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-operation.html
- MySQL 8.0 Reference Manual — Server Status Variable Reference: https://dev.mysql.com/doc/refman/8.0/en/server-status-variable-reference.html
- Percona Server 8.0 Documentation — Thread Pool: https://docs.percona.com/percona-server/8.0/thread-pool.html

## Issues Found

1. **`INSTALL PLUGIN thread_pool` is not the documented method.** The post showed `INSTALL PLUGIN thread_pool SONAME 'thread_pool.so';` for runtime installation, but the official MySQL docs only support loading the thread pool at server startup via `plugin-load-add=thread_pool.so` in `my.cnf`. Fixed by replacing the INSTALL PLUGIN approach with the my.cnf method and adding the separate INSTALL PLUGIN commands for the monitoring tables (TP_THREAD_STATE, TP_THREAD_GROUP_STATE, TP_THREAD_GROUP_STATS).

2. **`thread_pool_queue_timeout` does not exist.** This variable is not documented in MySQL Enterprise or Percona Server. Removed from the configuration variables table.

3. **`thread_pool_oversubscribe` is Percona-specific.** The variable was listed as a general thread pool variable but it only exists in Percona Server, not MySQL Enterprise Edition. Added "(Percona only)" label in the table and commented it out in the recommended config section.

4. **`thread_pool_max_active_query_threads` default 0 described as "unlimited".** A value of 0 means the plugin uses its default algorithm to manage threads automatically, not that there is no limit. Fixed description to "0 (default algorithm)".

5. **`thread_pool_stall_limit` used pre-8.0.14 units.** The post used the old MySQL 5.7 convention (value of 6 in 10ms increments = 60ms). Since MySQL 8.0.14, the unit is milliseconds and the default is 60. Updated the table, config snippet, and comments to use the MySQL 8.0 convention.

6. **`SHOW STATUS LIKE 'Threadpool%'` has no results in MySQL Enterprise 8.0.** MySQL 8.0 Enterprise does not expose `Threadpool_*` status variables. Thread pool monitoring is done through information_schema tables. Fixed monitoring section to lead with the information_schema approach and note that `SHOW STATUS LIKE 'Threadpool%'` is available on Percona Server.

7. **`Threadpool_stall_limit` in SHOW STATUS example output.** This is a system variable (SHOW VARIABLES), not a status variable (SHOW STATUS). Removed it from the example output and corrected the example to show only valid Percona status variables.

## Review Notes
- `thread_pool_max_active_query_threads` was deprecated in MySQL 8.0.31 in favor of `thread_pool_query_threads_per_group`. The post does not mention this deprecation. A future update could note the newer variable for MySQL 8.0.31+ users.
- The post does not specify a target MySQL version. Since it covers both MySQL Enterprise and Percona, some variable availability differs between distributions. The fixes added labels to clarify distribution-specific variables.
- The `TP_THREAD_GROUP_STATE` information_schema table was not mentioned in the original post — it was added to the monitoring section for completeness alongside the existing `TP_THREAD_GROUP_STATS` and `TP_THREAD_STATE` references.
