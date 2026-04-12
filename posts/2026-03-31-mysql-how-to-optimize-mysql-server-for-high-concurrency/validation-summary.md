# Validation Summary: How to Optimize MySQL Server for High Concurrency

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- MySQL Performance Schema
- Percona Server thread pool (referenced)
- MySQL Enterprise thread pool (referenced)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool Configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html)
- MySQL 8.0 Reference Manual: InnoDB I/O Configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-performance-io.html)
- MySQL 8.0 Reference Manual: Server System Variables — back_log (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_back_log)
- MySQL 8.0 Reference Manual: Thread Pool (https://dev.mysql.com/doc/refman/8.0/en/thread-pool.html)
- MySQL 8.0 Reference Manual: Performance Schema (https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html)
- MySQL 8.0 Reference Manual: InnoDB Lock Wait Timeout (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_lock_wait_timeout)
- MySQL 8.0 Reference Manual: data_locks table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html)

## Issues Found

1. **Incorrect `innodb_buffer_pool_instances` comment**: The comment said "One instance per GB (max 64)", implying you should create one instance for each GB of buffer pool (which would mean 12 instances for 12GB). The correct MySQL guideline is that each instance should be at least 1GB in size. The configured value of 8 instances for 12GB is correct (1.5GB per instance), but the comment was misleading. Fixed to: "Each instance should be at least 1GB (max 64)".

2. **Incorrect `back_log` comment**: The comment said "Connection queue when max_connections is reached", which is incorrect. `back_log` controls the size of the TCP listen queue for incoming connection requests waiting to be accepted by the MySQL main thread. It is not related to what happens when `max_connections` is exhausted (those connections receive a "Too many connections" error). Fixed to: "TCP listen queue for pending connection requests".

## Review Notes
- The `thread_handling = pool-of-threads` syntax is specific to Percona Server. MySQL Enterprise uses a plugin-based approach (`plugin-load-add=thread_pool.so`). The post correctly notes both platforms are required but only shows Percona syntax. This is acceptable since the post mentions both options.
- The `performance_schema.data_locks` table is MySQL 8.0+ specific. In MySQL 5.7 the equivalent was `INFORMATION_SCHEMA.INNODB_LOCKS`. Since MySQL 8.0 has been the current major version for years, this is fine.
- The per-connection buffer sizes (4M sort/join buffers) are relatively generous for truly high-concurrency scenarios. With 500 max_connections, worst case memory for sort buffers alone could reach 2GB. The post does advise keeping them low, which is correct guidance.
- The `SUM_TIMER_WAIT/1e12` conversion in the monitoring query correctly converts picoseconds to seconds.
