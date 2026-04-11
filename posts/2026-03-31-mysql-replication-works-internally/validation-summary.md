# Validation Summary: How MySQL Replication Works Internally

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- MySQL binary log (binlog)
- MySQL replication (IO thread, SQL thread)
- GTID-based replication
- Parallel replication (LOGICAL_CLOCK)
- Semi-synchronous replication

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication — https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual: Binary Log — https://dev.mysql.com/doc/refman/8.0/en/binary-log.html
- MySQL 8.0 Reference Manual: GTID Concepts — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-concepts.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: Semisynchronous Replication — https://dev.mysql.com/doc/refman/8.0/en/replication-semisync.html
- MySQL 8.0 Reference Manual: Performance Schema Replication Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html
- MySQL Internals: Two-Phase Commit and Binary Log Group Commit — https://dev.mysql.com/doc/refman/8.0/en/innodb-two-phase-commit.html

## Issues Found

### 1. Incorrect binary log write order
- **What was wrong:** The post stated the binary log "is written after InnoDB commits a transaction to the redo log." In MySQL's two-phase commit protocol, the actual sequence is: InnoDB prepare (redo log) → binary log write → InnoDB commit. The binlog is written between the prepare and commit phases, not after commit. This ordering is critical for crash recovery correctness.
- **What was changed:** Updated the sentence to explain the two-phase commit sequence: InnoDB prepares in the redo log, then the binary log entry is written, then InnoDB commits.
- **Why:** This is a fundamental aspect of MySQL's crash recovery and replication correctness. If the server crashes after binlog write but before InnoDB commit, the transaction is recovered during startup because it exists in the binlog. The original description misrepresented this ordering.

### 2. Non-existent column in performance_schema query
- **What was wrong:** The query `SELECT SECONDS_BEHIND_SOURCE FROM performance_schema.replication_applier_status_by_coordinator` references a column that does not exist in that table. The `replication_applier_status_by_coordinator` table contains columns like CHANNEL_NAME, THREAD_ID, SERVICE_STATE, and various transaction timestamp fields — but not `SECONDS_BEHIND_SOURCE`.
- **What was changed:** Replaced the incorrect query with `SHOW REPLICA STATUS\G` which correctly exposes the `Seconds_Behind_Source` field in its output.
- **Why:** The original query would fail with an "Unknown column" error. `SHOW REPLICA STATUS` is the standard and correct way to check replication lag via `Seconds_Behind_Source`.

## Review Notes
- The post uses MySQL 8.0.22+ syntax (`SHOW REPLICA STATUS`, `CHANGE REPLICATION SOURCE TO`, `START REPLICA`) which is the current recommended style. The field names in `SHOW REPLICA STATUS` output still use the older `Master_Log_File` naming alongside newer aliases — the post correctly shows the older field names that appear in the output.
- `binlog_format` is deprecated in MySQL 8.0.34+ and removed in MySQL 9.0, where ROW is the only format. The post's recommendation of ROW format remains correct and forward-compatible.
- `replica_parallel_type` is deprecated in MySQL 8.0.29+ and removed in MySQL 8.4/9.0, where LOGICAL_CLOCK is the only option. The configuration shown is correct for MySQL 8.0 but will need updating for newer versions.
- The semi-synchronous replication plugin approach shown (`INSTALL PLUGIN ... SONAME 'semisync_source.so'`) is correct for MySQL 8.0.26+. MySQL 8.0.26 introduced the `source`/`replica` naming to replace `master`/`slave` naming for these plugins.
