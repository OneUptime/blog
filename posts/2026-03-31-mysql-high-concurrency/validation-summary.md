# Validation Summary: How to Optimize MySQL for High Concurrency

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0 (InnoDB storage engine)
- Percona Server for MySQL
- MySQL Enterprise Edition (Thread Pool plugin)
- ProxySQL (connection pooling)
- Linux OS tuning (sysctl, limits.conf, fstab)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — InnoDB Startup Options and System Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — Binary Logging Options: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual — Thread Pool Installation: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-installation.html
- MySQL 8.0 Reference Manual — Thread Pool Tuning: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-tuning.html
- MySQL Server Version Reference — 8.0 Changes: https://dev.mysql.com/doc/mysqld-version-reference/en/optvar-changes-8-0.html
- Percona Server 8.0 Thread Pool Documentation: https://docs.percona.com/percona-server/8.0/threadpool.html

## Issues Found

### 1. `innodb_flush_log_at_trx_commit` labels were incorrect
**What was wrong:** Value 2 was labeled "Fastest" and value 0 was labeled "Fastest but risky." In reality, value 0 is the fastest option (writes and flushes only once per second), while value 2 is a middle ground (writes to OS cache at each commit, flushes once per second).
**What was changed:** Reordered the settings from safest to fastest (1, 2, 0) with accurate descriptions of the crash-safety tradeoffs for each.
**Why:** Per MySQL 8.0 InnoDB documentation, value 0 performs less I/O than value 2 since it skips writing to the OS file cache at commit time.

### 2. `sync_binlog = 0` comment overstated precision of data loss window
**What was wrong:** The comment stated "lose < 1s on OS crash," implying a bounded 1-second loss window.
**What was changed:** Changed to "OS-managed flush (fastest; loss window depends on OS)" to accurately reflect that the loss window is undefined and depends on the OS's dirty-page writeback behavior.
**Why:** Per MySQL documentation, with `sync_binlog = 0`, MySQL relies entirely on the OS to flush the binary log to disk. The OS flush interval is governed by kernel settings like `dirty_writeback_centisecs` (default 5s) and `dirty_expire_centisecs` (default 30s), so losses could far exceed 1 second.

### 3. `thread_handling = pool-of-threads` presented as valid for MySQL Enterprise Edition
**What was wrong:** The post grouped "Percona Server or MySQL Enterprise" together with a single config block using `thread_handling = pool-of-threads`, which is Percona-specific syntax. MySQL Enterprise Edition uses a plugin-based thread pool that is loaded via `plugin-load-add = thread_pool.so`, and the server automatically sets `thread_handling = loaded-dynamically`.
**What was changed:** Split into two separate config blocks — one for Percona Server (using `thread_handling = pool-of-threads`) and one for MySQL Enterprise Edition (using `plugin-load-add = thread_pool.so`). Also noted that `thread_pool_stall_limit` uses different units: milliseconds in Percona, 10ms intervals in MySQL Enterprise.
**Why:** Per MySQL 8.0 Thread Pool Installation docs and Percona Server Thread Pool docs, the two implementations have different configuration syntax and different units for `thread_pool_stall_limit`.

## Review Notes
- The `thread_stack` default of 1M is correct for MySQL 8.0.27+ (changed from ~280K in 8.0.26 and earlier). The post doesn't specify a minimum MySQL version, so readers on older 8.0.x releases should be aware that the default was previously ~280K.
- `innodb_buffer_pool_instances` was deprecated in MySQL 8.4.0 and removed in MySQL 9.0.0 (replaced by internal partitioning). The advice is correct for MySQL 8.0.x but will not apply to future major versions.
- The "one per GB" rule of thumb for `innodb_buffer_pool_instances` is a common Percona recommendation. With the example 24G buffer pool, one per GB would yield 24 instances, not the 16 shown. The value of 16 is still reasonable; the comment is a guideline, not a strict formula.
- The monitoring section uses `information_schema.PROCESSLIST`, which works but is deprecated in MySQL 8.0.22+ in favor of `performance_schema.processlist`. Both still function in MySQL 8.0.x.
- All SQL syntax, InnoDB configuration variables, OS tuning commands, and monitoring queries are correct and current for MySQL 8.0.
