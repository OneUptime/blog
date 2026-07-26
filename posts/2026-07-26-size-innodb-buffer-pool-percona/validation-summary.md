# Validation Summary: How to Size the InnoDB Buffer Pool Without Causing Swap or OOM on Percona Server

## Status
validated

## Post Type
Guide / Capacity-planning tutorial

## Technologies Covered
- Percona Server for MySQL 8.4
- MySQL 8.4
- InnoDB buffer pool
- MySQL Performance Schema and sys schema
- Percona Monitoring and Management (PMM)
- Percona XtraBackup
- Linux procfs
- Linux cgroup v2
- systemd resource controls
- Containers and Kubernetes memory limits

## Sources Consulted
- MySQL 8.4 `innodb_buffer_pool_size` system variable: https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_buffer_pool_size
- MySQL 8.4 configuring and resizing the InnoDB buffer pool: https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-resize.html
- MySQL 8.4 InnoDB buffer pool internals and monitoring: https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html
- MySQL 8.4 server status variables: https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html
- MySQL 8.4 memory-use model: https://dev.mysql.com/doc/refman/8.4/en/memory-use.html
- MySQL 8.4 monitoring memory with Performance Schema: https://dev.mysql.com/doc/refman/8.4/en/monitor-mysql-memory-use.html
- MySQL 8.4 sys schema memory views: https://dev.mysql.com/doc/refman/8.4/en/sys-memory-global-by-current-bytes.html
- MySQL 8.4 formatted versus raw `x$` sys schema views: https://dev.mysql.com/doc/refman/8.4/en/sys-schema-views.html
- MySQL 8.4 internal temporary-table memory limits: https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html
- MySQL 8.4 change buffer: https://dev.mysql.com/doc/refman/8.4/en/innodb-change-buffer.html
- MySQL 8.4 `SET` variable assignment and persistence: https://dev.mysql.com/doc/refman/8.4/en/set-variable.html
- MySQL 8.4 saving and restoring buffer-pool state: https://dev.mysql.com/doc/refman/8.4/en/innodb-preload-buffer-pool.html
- Percona Server for MySQL 8.4 defaults and tuning guidance: https://docs.percona.com/percona-server/8.4/8.4-defaults-and-tuning.html
- Percona Server for MySQL 8.4 system and status variables: https://docs.percona.com/percona-server/8.4/percona-server-system-variables.html
- Percona Server for MySQL post-installation and systemd service guidance: https://docs.percona.com/percona-server/8.4/post-installation.html
- Percona Monitoring and Management MySQL configuration: https://docs.percona.com/percona-monitoring-and-management/3/install-pmm/install-pmm-client/connect-database/mysql/mysql.html
- Linux kernel cgroup v2 memory-controller documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- systemd resource-control manual (`MemoryHigh`, `MemoryMax`, and effective limits): https://man7.org/linux/man-pages/man5/systemd.resource-control.5.html
- systemctl manual (`show`, `--property`, and `--value`): https://man7.org/linux/man-pages/man1/systemctl.1.html
- Linux `/proc/PID/status` manual: https://man7.org/linux/man-pages/man5/proc_pid_status.5.html
- Linux `swapon` manual: https://man7.org/linux/man-pages/man8/swapoff.8.html
- Linux `pidof` manual: https://man7.org/linux/man-pages/man1/pidof.1.html

## Issues Found
- The host-limit check displayed a unit's configured `MemoryHigh` and `MemoryMax`, which can miss stricter limits inherited from parent slices, and it assumed the service was always named `mysql`. Updated it to query `EffectiveMemoryHigh`, `EffectiveMemoryMax`, and `ControlGroup`, documented the common `mysql.service`/`mysqld.service` distinction, and resolved the service's actual cgroup v2 directory before reading `memory.max`, `memory.current`, and `memory.events`.
- The procfs example could produce an invalid `/proc/...` path when `pidof` returned multiple PIDs, omitted `RssAnon` despite recommending anonymous-memory monitoring, and did not mention that Linux documents `VmRSS` as approximate. Changed it to request one PID, include `RssAnon`, and explain the distinction between approximate per-process RSS and the cgroup-wide memory charge.
- The server-variable query used unqualified `@@` references, which return session values for variables with both session and global scope even though the section is reviewing server defaults. Changed the query to explicit `@@GLOBAL` references and added the documented thread-stack and network-buffer controls mentioned by the surrounding explanation.
- The query omitted the MySQL 8.4 `TempTable` engine's global limits and could imply that `max_heap_table_size` constrains the default engine. Added `internal_tmp_mem_storage_engine`, `temptable_max_ram`, and `temptable_max_mmap`, and clarified that `max_heap_table_size` does not limit `TempTable`.
- The Performance Schema guidance described allocations as fully observable without noting that most memory instruments are disabled by default. Changed the wording to "instrumented allocation" and added the documented startup-instrumentation requirement.
- The memory query ordered `sys.memory_global_by_current_bytes.current_alloc`, a human-formatted string such as `131.06 MiB`, so the explicit sort could be lexicographic rather than numeric. Switched the query to `sys.x$memory_global_by_current_bytes`, whose byte counts are raw numeric values suitable for `ORDER BY`.
- The non-pool checklist treated change-buffer structures as memory outside the configured pool. MySQL documents that the in-memory change buffer occupies part of the buffer pool. Replaced that item with additional InnoDB buffers and control structures that are outside the configured pool.
- The persistence note said a runtime-only `SET GLOBAL` did not "necessarily" survive restart. MySQL documents that a global runtime value lasts until the server exits; only persisted configuration or `SET PERSIST` survives. Changed the statement to say it does not survive restart.

## Review Notes
- The 80% dedicated-server starting point, approximately 10% additional InnoDB allocation, chunk/instance alignment rule, `48G` option-file syntax, 48 GiB byte value, dynamic resize behavior, and resize-status query are consistent with MySQL 8.4 documentation.
- The warnings about active transactions delaying a resize and buffer-pool access blocking during resize phases are accurate.
- `Innodb_buffer_pool_read_requests` and `Innodb_buffer_pool_reads` are correctly identified as logical requests and reads that could not be satisfied from the buffer pool. Using interval deltas instead of lifetime ratios is sound.
- The cgroup v2 descriptions of `memory.current`, `memory.max`, `memory.events`, and `oom_kill` are accurate. `MemoryHigh` is a throttling/reclaim threshold; `MemoryMax` is the hard limit that can invoke the cgroup OOM killer.
- Buffer-pool dump/load is enabled by default in MySQL 8.4, but retaining the wording "where appropriate" is correct because restart and warmup behavior should still be tested for the deployment.
- All five links in the post's Official Documentation section resolve to the intended MySQL 8.4 or Percona Server 8.4 documentation.
