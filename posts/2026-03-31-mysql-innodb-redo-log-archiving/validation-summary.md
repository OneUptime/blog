# Validation Summary: How to Understand InnoDB Redo Log Archiving in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0.17+ (InnoDB storage engine)
- InnoDB redo log archiving
- Percona XtraBackup 8.0
- MySQL Enterprise Backup

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Redo Log: https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual — Performance Schema Status Variable Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- Percona XtraBackup 8.0 Option Reference: https://docs.percona.com/percona-xtrabackup/8.0/xtrabackup-option-reference.html

## Issues Found

1. **Second argument to `innodb_redo_log_archive_start()` misidentified**: The post described the second argument as a "unique session label used to name the archive file." Per MySQL docs, it is actually an optional subdirectory name appended to the archive directory path. Fixed the description accordingly.

2. **Archive file naming pattern incorrect**: The post showed the file name as `my-backup-session.000001.archive.log`. The actual MySQL archive file naming format is `archive.<server_uuid>.000001.log`, placed inside the subdirectory (if specified). Fixed the example path to `/var/mysql/redo-archive/my-backup-session/archive.<server_uuid>.000001.log`.

3. **Monitoring query used wrong column name**: The query referenced `STATUS_VAR` as the column in `performance_schema.global_status`. The correct column name is `VARIABLE_NAME`. Fixed the column name and simplified the WHERE clause filter.

4. **Monitoring query referenced unrelated status variables**: The original query filtered on `innodb_redo_log_enabled%` which relates to the redo log enable/disable feature (MySQL 8.0.21+), not redo log archiving. Fixed to use a broader `Innodb_redo_log%` pattern.

5. **Wrong privilege name**: The post stated `BACKUP_ADMIN` is required. Per MySQL docs, the required privilege is `INNODB_REDO_LOG_ARCHIVE`. Fixed.

6. **Incorrect XtraBackup flag**: The post used `--innodb-redo-log-arch-dir`. Per Percona documentation, the correct flag is `--redo-log-arch-dir`. Fixed.

## Review Notes
- MySQL does not provide a dedicated status variable specifically for monitoring whether redo log archiving is currently active. The monitoring section's SQL query will return general redo log status information, but the most reliable way to check if archiving is active is to monitor the archive directory for file growth or check the MySQL error log.
- The `--redo-log-arch-dir` option in Percona XtraBackup was introduced in version 8.0.34-29. Users on older XtraBackup versions may not have this option available.
- The post correctly notes that if the session disconnects, archiving is automatically stopped. However, it should be noted that MySQL also removes the archive file in this case, per the official docs.
