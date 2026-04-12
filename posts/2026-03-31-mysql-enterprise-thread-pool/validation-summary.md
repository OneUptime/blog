# Validation Summary: How to Use MySQL Enterprise Thread Pool

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL Enterprise Edition
- MySQL Enterprise Thread Pool plugin
- Performance Schema thread pool tables

## Sources Consulted
- MySQL 8.0 Reference Manual: MySQL Enterprise Thread Pool — https://dev.mysql.com/doc/refman/8.0/en/thread-pool.html
- MySQL 8.0 Reference Manual: Thread Pool Installation — https://dev.mysql.com/doc/refman/8.0/en/thread-pool-installation.html
- MySQL 8.0 Reference Manual: Thread Pool Operation — https://dev.mysql.com/doc/refman/8.0/en/thread-pool-operation.html
- MySQL 8.0 Reference Manual: Thread Pool Tuning — https://dev.mysql.com/doc/refman/8.0/en/thread-pool-tuning.html
- MySQL 8.4 Reference Manual: Thread Pool System Variables — https://dev.mysql.com/doc/refman/8.4/en/thread-pool-operation.html
- MySQL 8.0 Reference Manual: tp_thread_group_stats Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-tp-thread-group-stats-table.html
- MySQL 8.0 Reference Manual: tp_thread_state Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-tp-thread-state-table.html
- MySQL 8.0 Reference Manual: Thread Pool FAQ — https://dev.mysql.com/doc/refman/8.0/en/faqs-thread-pool.html

## Issues Found

1. **False claim about Community Edition availability**: The post stated the thread pool is available "in MySQL Community via the `thread_pool` plugin on some platforms." This is incorrect — MySQL Enterprise Thread Pool is exclusive to MySQL Enterprise Edition. Removed the Community Edition claim.

2. **Percona Server config option `thread_handling=pool-of-threads`**: The `my.cnf` startup example included `thread_handling=pool-of-threads`, which is a Percona Server / MariaDB setting, not a MySQL Enterprise setting. In MySQL Enterprise, the thread pool is activated simply by loading the plugin. Removed this line.

3. **Incorrect/Percona-specific variable names in the configuration reference**:
   - `thread_pool_idle_timeout` does not exist in MySQL Enterprise (it is a Percona Server variable). Replaced with `thread_pool_max_unused_threads`.
   - `thread_pool_high_prio_mode` does not exist in MySQL Enterprise (it is a Percona Server variable). Replaced with `thread_pool_high_priority_connection` and `thread_pool_prio_kickup_timer`.

4. **Wrong default for `thread_pool_size`**: The post claimed the default is "CPU count." The actual default in MySQL Enterprise is the fixed value 16. Corrected.

5. **Wrong table schema for monitoring queries**: All three monitoring queries referenced `information_schema` tables. In MySQL 8.0+, the thread pool tables are in `performance_schema`, not `information_schema`. Corrected all three queries.

6. **Wrong column names in `TP_THREAD_GROUP_STATS` query**: `GROUP_ID` → `TP_GROUP_ID`, `THREADS_CREATED` → `THREADS_STARTED`, `STALLS` → `STALLED_QUERIES_EXECUTED`. Corrected all three.

7. **Wrong column name and value in `TP_THREAD_STATE` query**: The query used `WHERE TYPE = 'WORKER'`. The correct column is `TP_THREAD_TYPE` and the correct value is `QUERY_WORKER_THREAD`. Corrected.

8. **Percona-specific high-priority connection syntax**: `SET GLOBAL thread_pool_high_prio_mode = 'transactions'` is Percona Server syntax. Replaced with the correct MySQL Enterprise mechanism: `SET SESSION thread_pool_high_priority_connection = 1` and `SET GLOBAL thread_pool_prio_kickup_timer`. Updated the surrounding explanatory text accordingly.

## Review Notes
- The post originally conflated MySQL Enterprise Thread Pool with Percona Server's thread pool implementation across multiple sections. All Percona-specific syntax and variable names have been corrected to their MySQL Enterprise equivalents.
- The `thread_pool_stall_limit` default was also added (60ms) for clarity in the variable reference section.
- The `TP_THREAD_TYPE` column and its `QUERY_WORKER_THREAD` value were introduced in MySQL 8.0.32. The post does not specify a version, so this is acceptable, but readers on older 8.0.x releases should be aware.
