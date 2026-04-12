# Validation Summary: What Is the BLACKHOLE Storage Engine in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL BLACKHOLE storage engine
- MySQL binary logging
- MySQL replication (GTID-based)
- MySQL relay server topology

## Sources Consulted
- MySQL 8.0 Reference Manual: The BLACKHOLE Storage Engine — https://dev.mysql.com/doc/refman/8.0/en/blackhole-storage-engine.html
- MySQL 8.0 Reference Manual: Binary Logging Formats — https://dev.mysql.com/doc/refman/8.0/en/binary-log-formats.html
- MySQL 8.0 Reference Manual: SHOW BINARY LOG STATUS — https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.0 Reference Manual: Replication and the BLACKHOLE engine — https://dev.mysql.com/doc/refman/8.0/en/replication-features-blackhole.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html

## Issues Found

### 1. Incorrect `binlog_format = ROW` for BLACKHOLE tables
- **What was wrong:** The "Binary Log Connection" section showed `binlog_format = ROW` in the my.cnf configuration comment. With ROW-based binary logging, DML operations on BLACKHOLE tables are NOT logged to the binary log because the BLACKHOLE engine reports zero rows changed. This directly contradicts the post's claim that "writes to BLACKHOLE tables are still written to the MySQL binary log."
- **What was changed:** Changed `binlog_format = ROW` to `binlog_format = STATEMENT` and added a note explaining that ROW format does not work with BLACKHOLE tables for binary log capture. STATEMENT or MIXED format must be used.
- **Why:** This is a critical correctness issue. If a reader followed the original configuration, the entire relay use case described in the post would silently fail — events would not be written to the binary log and downstream replicas would receive nothing.

### 2. Missing `log_replica_updates` for relay topology
- **What was wrong:** The relay server configuration did not mention `log_replica_updates = ON`, which is required for the relay topology to function. Without it, events received from the primary and applied by the replica SQL thread are not written to the relay server's own binary log, so downstream replicas cannot consume them.
- **What was changed:** Added a comment in the relay server SQL block showing that `log_replica_updates = ON` must be set in my.cnf on the relay server.
- **Why:** This is a required configuration for the relay use case. Without it, the architecture described in the post does not work.

### 3. Deprecated `SHOW MASTER STATUS` command
- **What was wrong:** The post used `SHOW MASTER STATUS`, which is deprecated as of MySQL 8.2.0. The rest of the post uses modern MySQL 8.0.22+ syntax (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`).
- **What was changed:** Replaced `SHOW MASTER STATUS` with `SHOW BINARY LOG STATUS` for consistency with the modern syntax used elsewhere in the post.
- **Why:** `SHOW BINARY LOG STATUS` is the non-deprecated replacement introduced in MySQL 8.2.0. Since the post already targets modern MySQL syntax, this keeps the post consistent and forward-compatible.

## Review Notes
- The post correctly identifies the two main use cases for BLACKHOLE: replication relay and benchmarking.
- The `CHANGE REPLICATION SOURCE TO` syntax (MySQL 8.0.23+) and `START REPLICA` (MySQL 8.0.22+) are correct modern syntax.
- The `SOURCE_AUTO_POSITION = 1` parameter is correct for GTID-based replication.
- The BLACKHOLE engine is included by default in MySQL 8.0+ but is a plugin that can be disabled. The `SHOW ENGINES` check is the correct way to verify availability.
- The CREATE TABLE syntax with ENGINE=BLACKHOLE is correct and will work as described.
