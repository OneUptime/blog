# Validation Summary: How to Build MySQL Replication Topologies

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- MySQL 8.x replication
- GTID-based replication
- Binary log file/position replication
- Cascading replication
- Multi-source replication
- Circular replication
- Replication filters
- Performance Schema replication monitoring
- ProxySQL read/write splitting
- Percona XtraBackup

## Sources Consulted
- MySQL 8.4 Reference Manual: CHANGE REPLICATION SOURCE TO Statement - https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html
- MySQL 8.4 Reference Manual: CHANGE REPLICATION FILTER Statement - https://dev.mysql.com/doc/refman/8.4/en/change-replication-filter.html
- MySQL 8.4 Reference Manual: GTID Auto-Positioning - https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-auto-positioning.html
- MySQL 8.4 Reference Manual: Creating a User for Replication - https://dev.mysql.com/doc/refman/8.4/en/replication-howto-repuser.html
- MySQL 8.4 Reference Manual: Setting the Replica Configuration - https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/replication-howto-slavebaseconfig.html
- MySQL 8.4 Reference Manual: Replica Server Options and Variables - https://dev.mysql.com/doc/refman/8.4/en/replication-options-replica.html
- MySQL 8.4 Reference Manual: mysqldump - https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- MySQL 8.0 Reference Manual: Connection Compression Control - https://dev.mysql.com/doc/refman/8.0/en/connection-compression-control.html
- ProxySQL Documentation: Read/Write Split - https://proxysql.com/documentation/proxysql-read-write-split-howto/
- Percona XtraBackup 8.0 Documentation: Restore a Backup - https://docs.percona.com/percona-xtrabackup/8.0/restore-a-backup.html

## Issues Found
- Removed `master_info_repository = TABLE` and `relay_log_info_repository = TABLE` from the replica configuration because these metadata repository variables are deprecated in MySQL 8.x and crash-safe table repositories are the default behavior in current MySQL.
- Expanded the Percona XtraBackup restore example to stop MySQL, restore into the data directory, fix file ownership, and restart MySQL. Percona documents that `--copy-back` requires a stopped server and an empty data directory.
- Updated the mysqldump position comment from old `CHANGE MASTER TO MASTER_LOG_FILE` terminology to current `CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE` terminology.
- Added `apply = 1` to ProxySQL read/write split rules so `SELECT ... FOR UPDATE` is not evaluated by later read-routing rules.
- Corrected the multi-source filter explanation. `REPLICATE_DO_DB` filters databases; database renaming requires rewrite filters, not the shown include filters.
- Added `STOP REPLICA SQL_THREAD` / `START REPLICA SQL_THREAD` around dynamic `CHANGE REPLICATION FILTER` examples, as MySQL requires the replication SQL thread to be stopped when changing filters.
- Renamed a Performance Schema query from a lag query to an applier status query because the selected fields report applier service and errors, not lag.
- Clarified that `replica_parallel_type = LOGICAL_CLOCK` and `replica_preserve_commit_order = ON` are defaults in MySQL 8.4.
- Replaced deprecated `replica_compressed_protocol = ON` guidance with `SOURCE_COMPRESSION_ALGORITHMS` and `SOURCE_ZSTD_COMPRESSION_LEVEL`, and wrapped the connection change with `STOP REPLICA IO_THREAD` / `START REPLICA IO_THREAD`.
- Added `STOP REPLICA SQL_THREAD` before the GTID skip transaction example so the empty GTID transaction can be injected before resuming replication.

## Review Notes
The post remains a practical tutorial and is technically valid after the corrections. Some operational examples still use simplified placeholder credentials and hostnames, which is acceptable for a guide but should be replaced with environment-specific values in production.
