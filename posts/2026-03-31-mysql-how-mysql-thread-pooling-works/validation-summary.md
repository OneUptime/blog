# Validation Summary: How MySQL Thread Pooling Works

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL Enterprise Edition (Thread Pool plugin)
- MariaDB (built-in thread pool)
- Percona Server (thread pool plugin)
- ProxySQL (connection pooling)

## Sources Consulted
- MySQL 8.0 Reference Manual - Thread Pool Operation: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-operation.html
- MySQL 8.0 Reference Manual - Thread Pool Installation: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-installation.html
- MySQL 8.0 Reference Manual - Thread Pool Tuning: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-tuning.html
- MySQL 8.0 Reference Manual - tp_thread_group_stats Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-tp-thread-group-stats-table.html
- MySQL 8.0 Reference Manual - tp_thread_state Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-tp-thread-state-table.html
- ProxySQL configuration reference (GitHub): https://github.com/sysown/proxysql/blob/v2.x/etc/proxysql.cnf
- Percona Server Thread Pool documentation: https://docs.percona.com/percona-server/8.0/threadpool.html

## Issues Found

1. **Timer thread described as per-group (Architecture section)**: The post listed "a timer thread" under "Each group has:", implying one timer thread per thread group. The MySQL docs state there is a single background timer thread for the entire thread pool. Fixed by moving the timer thread description outside the per-group list.

2. **`thread_pool_size` default listed as "CPU cores" (Configuration table)**: The actual default in MySQL Enterprise is 16. Setting it to the number of CPU cores is the recommended practice, but the default value is 16. Changed "CPU cores" to "16" and adjusted the description to say "usually set to CPU cores" instead of "usually = CPU cores".

3. **`thread_pool_stall_limit` default listed as 500 (Configuration table)**: The MySQL Enterprise default is 60 milliseconds (or 6 in pre-8.0.14 units of 10ms). The value 500 is the Percona Server default, not MySQL Enterprise. Since the section is about the Enterprise Thread Pool plugin, changed to 60.

4. **Monitoring metric column names incorrect (Monitoring section)**: The post listed `THREAD_COUNT`, `QUEUE_LENGTH`, and `STALL_COUNT` as key metrics. `QUEUE_LENGTH` and `STALL_COUNT` are not actual column names in `TP_THREAD_GROUP_STATS`. Replaced with real column names: `QUERIES_QUEUED`, `STALLED_QUERIES_EXECUTED`, and `THREADS_STARTED`.

5. **ProxySQL config syntax (ProxySQL section)**: The config snippet used `mysql_servers:` with a colon. The official ProxySQL config file format uses `mysql_servers =` with an equals sign. Changed colon to equals sign.

## Review Notes
- The `INSTALL PLUGIN thread_pool SONAME 'thread_pool.so';` syntax is technically valid but only installs the core plugin. In MySQL versions before 8.0.14, the monitoring tables (TP_THREAD_STATE, TP_THREAD_GROUP_STATE, TP_THREAD_GROUP_STATS) required separate INSTALL PLUGIN calls. The `plugin-load-add=thread_pool.so` method (also shown in the post) loads everything at once and is the officially recommended approach. Left as-is since the my.cnf method is also provided.
- As of MySQL 8.0.14, the thread pool monitoring tables moved from `information_schema` to `performance_schema`. The `information_schema` references in the post still work for backward compatibility but are deprecated. Not changed since the post doesn't target a specific MySQL 8.0.x minor version.
- The `thread_pool_prio_kickup_timer` default of 1000 is correct per MySQL documentation.
- The `thread_pool_max_threads` default of 100000 is the Percona Server default. MySQL Enterprise does not have this variable (it has `thread_pool_max_unused_threads` instead). The post doesn't distinguish, but since the table mixes Enterprise and Percona variables, this is a minor ambiguity rather than a clear error.
