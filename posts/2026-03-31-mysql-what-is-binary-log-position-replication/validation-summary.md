# Validation Summary: What Is Binary Log Position-Based Replication in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0.22+ syntax used throughout)
- MySQL Binary Log Replication
- mysqldump
- MySQL Replica Configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication with Global Transaction Identifiers (https://dev.mysql.com/doc/refman/8.0/en/replication-gtids.html)
- MySQL 8.0 Reference Manual: Setting Up Binary Log File Position Based Replication (https://dev.mysql.com/doc/refman/8.0/en/replication-howto.html)
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO Statement (https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html)
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html)
- MySQL 8.0 Reference Manual: Replication Relay and Status Logs (https://dev.mysql.com/doc/refman/8.0/en/replica-logs.html)
- MySQL 8.0.21 Release Notes: CREATE TABLE ... SELECT GTID restriction lifted (https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-21.html)
- MySQL 8.0 Reference Manual: mysqldump --source-data option (https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)

## Issues Found

1. **Incorrect metadata file reference (`relay-log.info` → `master.info`)**: The post stated that the replica stores the source log file name and position in `relay-log.info` / `mysql.slave_relay_log_info`. This is incorrect. The I/O thread's read position on the source's binary log is stored in `master.info` / `mysql.slave_master_info` (the connection metadata repository). The `relay-log.info` / `mysql.slave_relay_log_info` is the applier metadata repository, which tracks the SQL thread's position in the relay log. Fixed by changing the reference to `master.info` / `mysql.slave_master_info`.

2. **Outdated `CREATE TABLE ... SELECT` GTID incompatibility claim**: The post listed `CREATE TABLE ... SELECT` as a statement incompatible with GTID mode. This restriction was lifted in MySQL 8.0.21. Since the post uses MySQL 8.0.23+ syntax (`CHANGE REPLICATION SOURCE TO`), the target audience is on a version where this restriction no longer applies. Fixed by noting that MySQL 8.0.21 lifted many prior GTID restrictions including this one.

## Review Notes
- The post uses `SHOW MASTER STATUS` alongside modern 8.0.22+ syntax (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`). This is technically correct because `SHOW BINARY LOG STATUS` was not introduced until MySQL 8.2.0, so for MySQL 8.0.x there is no renamed equivalent.
- The `mysqldump --master-data=2` flag is deprecated in MySQL 8.0.26+ in favor of `--source-data=2`. Both still work in MySQL 8.0.x, so this is acceptable but worth noting for future updates.
- The `SHOW REPLICA STATUS` output column names used in the post (`Relay_Source_Log_File`, `Exec_Source_Log_Pos`, `Seconds_Behind_Source`, `Replica_IO_Running`, `Replica_SQL_Running`) are correct for MySQL 8.0.22+.
