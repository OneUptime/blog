# Validation Summary: How to Recover InnoDB Data After a Crash in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB crash recovery (redo log, undo log, WAL)
- mysqldump (logical backup/restore)
- Percona Xtrabackup (physical backup/restore)
- mysqlbinlog (point-in-time recovery)
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Recovery: https://dev.mysql.com/doc/refman/8.0/en/innodb-recovery.html
- MySQL 8.0 Reference Manual — innodb_force_recovery: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_force_recovery
- MySQL 8.0 Reference Manual — innodb_redo_log_capacity: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_redo_log_capacity
- MySQL 8.0 Reference Manual — CHECK TABLE: https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual — REPAIR TABLE: https://dev.mysql.com/doc/refman/8.0/en/repair-table.html
- MySQL 8.0 Reference Manual — Point-in-Time Recovery Using Binary Log: https://dev.mysql.com/doc/refman/8.0/en/point-in-time-recovery.html
- Percona Xtrabackup Documentation — Restoring a Backup: https://docs.percona.com/percona-xtrabackup/8.0/restore-a-backup.html

## Issues Found

### 1. mysqldump restore shown after stopping MySQL
- **What was wrong:** The backup restore section showed `mysql -u root -p < file.sql` after `sudo systemctl stop mysql`. The `mysql` client command requires the MySQL server to be running, so this would fail.
- **What was changed:** Separated the two restore methods into distinct flows. The mysqldump restore is now shown independently with a note that MySQL must be running. The Xtrabackup restore is shown as a separate block with `systemctl stop` preceding it.

### 2. Missing step to empty data directory before Xtrabackup --copy-back
- **What was wrong:** `xtrabackup --copy-back` requires the target data directory to be empty, but this step was not shown. Without it, the command will fail with an error.
- **What was changed:** Added `sudo rm -rf /var/lib/mysql/*` before the `--copy-back` step.

### 3. Redo log file names not version-aware
- **What was wrong:** The post referenced `ib_logfile0` and `ib_logfile1` as the redo log files. This is correct for MySQL versions before 8.0.30, but in MySQL 8.0.30+ the redo log was reorganized into the `#innodb_redo/` directory. Since the post later references MySQL 8.0.30+ for `innodb_redo_log_capacity`, readers could be confused.
- **What was changed:** Added a note clarifying that `ib_logfile0`/`ib_logfile1` apply to pre-8.0.30, and that 8.0.30+ uses the `#innodb_redo/` directory.

## Review Notes
- The Summary section mentions `innodb_force_recovery` as a recovery tool, but the post body never explains how to use it (what values to set, the escalation levels 1-6, or how to extract data once MySQL starts in recovery mode). A future revision could add a dedicated section on this important recovery technique.
- The SQL query `SELECT * FROM performance_schema.global_status WHERE VARIABLE_NAME LIKE 'Innodb_redo_log%'` is valid but does not directly indicate whether crash recovery occurred on startup. The MySQL error log is the authoritative source for that information, as the post correctly notes in the following sections.
- The `REPAIR TABLE` note is accurate — for InnoDB, it essentially rebuilds indexes and the recommendation to use `ALTER TABLE ... ENGINE=InnoDB` for a full table rebuild is correct.
