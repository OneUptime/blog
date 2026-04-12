# Validation Summary: How to Configure Parallel Replication in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (5.6+, 5.7+, 8.0.x)
- MySQL multi-threaded replication (parallel replication)
- MySQL Performance Schema
- MySQL binary log transaction dependency tracking

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication Options (Replica) — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html
- MySQL 8.0 Reference Manual: Performance Schema Replication Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html
- MySQL 8.4 Added/Deprecated/Removed — https://dev.mysql.com/doc/refman/8.4/en/added-deprecated-removed.html
- MySQL 8.4.0 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.4/en/news-8-4-0.html
- MySQL Worklog WL#9556 (binlog_transaction_dependency_tracking implementation) — https://dev.mysql.com/worklog/task/?id=9556
- MySQL Blog: MySQL 5.7.2 DMR and Labs — https://dev.mysql.com/blog-archive/mysql-5-7-2-dmr-and-labs-new-replication-features/
- MySQL Blog: Multi-threaded Replication Performance in MySQL 5.7 — https://dev.mysql.com/blog-archive/multi-threaded-replication-performance-in-mysql-5-7/
- MySQL 8.4 Performance Schema replication_applier_status_by_worker Table — https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-applier-status-by-worker-table.html

## Issues Found

1. **Wrong order of SET GLOBAL commands for source-side configuration**: The dynamic SQL section set `binlog_transaction_dependency_tracking = 'WRITESET'` before `transaction_write_set_extraction = 'XXHASH64'`. MySQL requires `transaction_write_set_extraction` to be non-OFF before `binlog_transaction_dependency_tracking` can be set to WRITESET, otherwise it throws `ER_WRONG_USAGE`. Swapped the order so `transaction_write_set_extraction` is set first.

2. **Misleading comment about `replica_preserve_commit_order`**: The config comment stated "Required for parallel replication with GTID," but `replica_preserve_commit_order` is not strictly required for parallel replication to function. It is strongly recommended (and is the default ON from MySQL 8.0.27) for commit order consistency, especially in chained replication or promotion scenarios. Changed to "Strongly recommended to preserve commit order consistency."

3. **Dangling comment in my.cnf snippet**: Removed orphaned comment "# Coordinate replication transactions with the relay log" that had no associated configuration directive.

## Review Notes
- The post uses `replica_*` variable names (introduced in MySQL 8.0.26) throughout but references feature availability from MySQL 5.6+ and 5.7.2+. Those older versions use `slave_*` variable names (e.g., `slave_parallel_type`, `slave_parallel_workers`). This is acceptable for a modern-focused post but could be noted for readers on older versions.
- In MySQL 8.4+, `binlog_transaction_dependency_tracking` (removed in 8.4.0) and `transaction_write_set_extraction` (removed in 8.3.0) no longer exist — their optimal values (WRITESET and XXHASH64) became the built-in defaults. The "Source-Side Configuration" section will not work on MySQL 8.4+. A version note could be added in a future update.
- `replica_parallel_type` itself was deprecated in MySQL 8.0.29 and removed in MySQL 9.5.0, with LOGICAL_CLOCK as the only behavior. The main "Configuring Parallel Replication" section still works on MySQL 8.0.x but would need adjustment for MySQL 9.5+.
- Setting `replica_preserve_commit_order = OFF` is deprecated as of MySQL 8.0.30.
