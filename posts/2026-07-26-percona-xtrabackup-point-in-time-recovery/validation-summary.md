# Validation Summary: How to Perform Point-in-Time Recovery with Percona XtraBackup and Binary Logs

## Status

validated

## Post Type

Technical tutorial and recovery guide

## Technologies Covered

- Percona XtraBackup 8.x
- Percona Server for MySQL
- MySQL 8.4
- MySQL binary logs
- `mysqlbinlog`
- Point-in-time recovery
- GTID-based recovery

## Sources Consulted

- [Percona XtraBackup point-in-time recovery](https://docs.percona.com/percona-xtrabackup/8.0/point-in-time-recovery.html)
- [Percona XtraBackup and binary logs](https://docs.percona.com/percona-xtrabackup/8.0/working-with-binary-logs.html)
- [Percona XtraBackup generated files](https://docs.percona.com/percona-xtrabackup/8.4/generated-files.html)
- [Percona XtraBackup prepare a full backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-full-backup.html)
- [Percona XtraBackup prepare an incremental backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-incremental-backup.html)
- [Percona XtraBackup restore documentation](https://docs.percona.com/percona-xtrabackup/8.4/quickstart-restore-back.html)
- [MySQL 8.4 `mysqlbinlog` utility](https://dev.mysql.com/doc/refman/8.4/en/mysqlbinlog.html)
- [MySQL 8.4 point-in-time recovery using binary logs](https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery-binlog.html)
- [MySQL 8.4 `mysql` client options](https://dev.mysql.com/doc/refman/8.4/en/mysql-command-options.html)
- [MySQL 8.4 command-line options that affect option-file handling](https://dev.mysql.com/doc/refman/8.4/en/option-file-options.html)

## Issues Found

- The timestamp-replay text referred generally to server time-zone assumptions, but MySQL documents `--stop-datetime` as relative to the local time zone of the machine running `mysqlbinlog`. The example now sets `TZ=UTC`, and the explanation states the actual interpretation.
- The replay pipelines did not pass `--binary-mode` to the `mysql` client. MySQL documents that this option is required when `mysqlbinlog` output contains null bytes, such as some BLOB values. Both replay examples now use it.
- The later-file position guidance suggested replaying complete intermediate files and then using a separate final command. This can break session-scoped state such as temporary tables. The text now states the documented behavior: `--start-position` applies to the first named log, `--stop-position` to the last, and all required logs should be supplied in order and applied through one client connection.
- A normal shell pipeline can hide a `mysqlbinlog` failure when the `mysql` client exits successfully. The replay examples now enable `pipefail` so a failure on either side produces a failed pipeline status.

## Review Notes

- The XtraBackup prepare, copy-back, ownership, metadata, and incremental-chain guidance matches the current Percona XtraBackup 8.x documentation.
- The binlog checksum verification, row-event inspection, timestamp stopping semantics, exact-position stopping semantics, GTID cautions, isolated validation, and retention guidance are technically sound.
- All five documentation links included in the post returned HTTP 200 during validation.
- Encrypted binary logs cannot be read directly by `mysqlbinlog`; the post correctly treats recoverable keys as a prerequisite, but an implementation for encrypted-log replay remains environment-specific.
