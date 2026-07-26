# Validation Summary: When Should You Enable Percona Server’s Thread Pool—and How Do You Size It?

## Status
validated

## Post Type
Technical performance-tuning guide

## Technologies Covered
- Percona Server for MySQL 8.4
- MySQL thread handling and thread pools
- MySQL Performance Schema and server status variables
- Linux `pidstat`, `pidof`, and `vmstat`
- OLTP concurrency and latency benchmarking

## Sources Consulted
- [Percona Server for MySQL 8.4 thread pool documentation](https://docs.percona.com/percona-server/8.4/threadpool.html)
- [Percona Server for MySQL 8.4 system and status variables](https://docs.percona.com/percona-server/8.4/percona-server-system-variables.html)
- [Percona Server for MySQL 8.4.10-10 release notes](https://docs.percona.com/percona-server/8.4/release-notes/8.4.10-10.html)
- [Percona Server 8.4.10-10 system-variable definitions](https://github.com/percona/percona-server/blob/Percona-Server-8.4.10-10/sql/sys_vars.cc)
- [Percona Server 8.4.10-10 thread-pool implementation](https://github.com/percona/percona-server/blob/Percona-Server-8.4.10-10/sql/threadpool_unix.cc)
- [Percona Server 8.4.10-10 `thread_pool_stall_limit` system-variable test](https://github.com/percona/percona-server/blob/Percona-Server-8.4.10-10/mysql-test/suite/sys_vars/t/thread_pool_stall_limit_basic.test)
- [MySQL 8.4 server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)
- [MySQL 8.4 Performance Schema wait event summary tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-wait-summary-tables.html)
- [MySQL 8.4 Performance Schema `threads` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-threads-table.html)
- [`pidstat(1)` Linux manual page](https://man7.org/linux/man-pages/man1/pidstat.1.html)
- [`pidof(1)` Linux manual page](https://man7.org/linux/man-pages/man1/pidof.1.html)
- [`vmstat(8)` Linux manual page](https://man7.org/linux/man-pages/man8/vmstat.8.html)

## Issues Found
- The `pidstat` example passed all PIDs returned by `pidof mysqld` as one space-separated argument, while `pidstat -p` requires a single PID or a comma-separated list. Added `pidof -s` so the command reliably supplies one PID.
- The description of `thread_pool_oversubscribe` treated its value as the total number of simultaneous threads in a group. Corrected it to describe the value as the number of additional active worker threads allowed per group, matching Percona Server's system-variable definition and `thread_pool_oversubscribe + 1` implementation.
- The post stated that `thread_pool_stall_limit` is not dynamic because the current 8.4 documentation labels it that way. Released Percona Server 8.4 source and regression tests, including 8.4.10-10, implement and test successful `SET GLOBAL` changes. Corrected the post, retained an exact-build verification caveat, added the working runtime statement, and kept the persistent configuration example.
- The stall-limit guidance referred broadly to blocking work. Corrected it to non-yielding work because waits reported through the thread-pool wait hooks can wake or create another worker independently of stall detection.
- The `none` priority mode was described as disabling priority-queue use for every connection. Percona Server always treats an admin connection as high priority, so the text and monitoring example now specify non-admin connections.

## Review Notes
- Direct thread-pool queue-depth and queue-wait status variables were added in Percona Server 8.4.10-10. On earlier 8.4 builds, equivalent queue observability is more limited.
- Percona's current 8.4 documentation and its released implementation disagree about whether `thread_pool_stall_limit` is dynamic; operators should verify runtime behavior on the exact installed build.
