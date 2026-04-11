# Validation Summary: How to Set Up MySQL Replication (Master-Replica)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (8.0.23+ based on syntax used)
- MySQL replication (binary log / relay log based)
- mysqldump
- systemctl (Linux service management)

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication — https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: Server System Variables (binlog_expire_logs_seconds) — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: mysqldump --source-data — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found

### 1. Deprecated `expire_logs_days` in source configuration
- **What was wrong:** The source server config used `expire_logs_days = 7`, which has been deprecated since MySQL 8.0.3 in favor of `binlog_expire_logs_seconds`. Since the post uses MySQL 8.0.23+ syntax throughout (e.g., `CHANGE REPLICATION SOURCE TO`, `START REPLICA`), this was inconsistent.
- **What was changed:** Replaced `expire_logs_days = 7` with `binlog_expire_logs_seconds = 604800` (7 days expressed in seconds).
- **Why:** Consistency with the MySQL 8.0.23+ target version and to avoid deprecation warnings.

### 2. Deprecated `--master-data` flag in mysqldump command
- **What was wrong:** The mysqldump command used `--master-data`, which was deprecated in MySQL 8.0.26 in favor of `--source-data`. The rest of the post consistently uses the newer replication terminology.
- **What was changed:** Replaced `--master-data` with `--source-data` in the mysqldump command.
- **Why:** Consistency with the modern MySQL 8.0 replication terminology used throughout the post.

## Review Notes
- The `SHOW MASTER STATUS` command in Step 3 is still correct for MySQL 8.0.x. Its replacement (`SHOW BINARY LOG STATUS`) was not introduced until MySQL 8.2.0, so there is no alternative in the 8.0.x series.
- The `FLUSH PRIVILEGES` after `GRANT` in Step 2 is unnecessary in MySQL 8.0+ (GRANT directly updates in-memory grant tables), but it is harmless and commonly included in tutorials.
- The `binlog_do_db` directive only replicates the named database. With row-based replication (default in MySQL 8.0), this filters on the actual database being modified, which is the intuitive behavior. Statement-based replication would filter on the default database (USE statement), which can be surprising. The post does not mention this nuance, but it is acceptable for a getting-started tutorial.
- The post's workflow of manually locking tables + recording binlog position and also using `--source-data` in mysqldump is somewhat redundant (the flag embeds the position in the dump), but both approaches are valid and having the manual step is useful for teaching the concept.
- The SHOW MASTER STATUS output example omits the `Executed_Gtid_Set` column present in MySQL 8.0, which is acceptable since GTIDs are not enabled in this tutorial.
