# Validation Summary: How to Back Up from a MySQL Replica

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0.26+ (replication, binary logging, GTID)
- mysqldump (logical backups)
- Percona XtraBackup 8.0 (physical backups)
- Bash scripting (automated backup scripts)

## Sources Consulted
- [MySQL 8.0 Reference Manual: mysqldump options](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html) — verified `--source-data`, `--dump-replica`, `--set-gtid-purged`, `--single-transaction` flags
- [MySQL 8.0.26 Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html) — confirmed deprecation of `--master-data` in favor of `--source-data`
- [Percona XtraBackup 8.0 Option Reference](https://docs.percona.com/percona-xtrabackup/8.0/xtrabackup-option-reference.html) — verified `--slave-info`, `--throttle`, `--compress` flags
- [Percona XtraBackup 8.0: Backups in Replication Environments](https://docs.percona.com/percona-xtrabackup/8.0/make-backup-in-replication-env.html) — verified `xtrabackup_slave_info` vs `xtrabackup_binlog_info` file behavior
- [Percona XtraBackup 8.4 File Index](https://docs.percona.com/percona-xtrabackup/8.4/xtrabackup-files.html) — cross-referenced file outputs

## Issues Found

1. **Deprecated `--master-data` flag**: The post used `--master-data=2` in three places (mysqldump command, automated script, summary) but the prerequisite configuration uses MySQL 8.0.26+ syntax (`log_replica_updates`, `STOP REPLICA`, etc.). Changed all instances to `--source-data=2` for consistency. `--master-data` was deprecated in MySQL 8.0.26.

2. **Incorrect claim about `--master-data=2` recording source position**: The post stated that `--master-data=2` "records the source binary log position (not the replica's position)." This is incorrect. `--source-data=2` (and `--master-data=2`) runs `SHOW MASTER STATUS` on the local server, which on a replica records the **replica's own** binary log position. The source's position requires `--dump-replica=2`. Fixed the explanation to clarify this distinction and note that with GTID mode, `--set-gtid-purged=ON` is what matters for seeding new replicas.

3. **Missing `--slave-info` flag in XtraBackup command**: The post claimed XtraBackup records the source's position in `xtrabackup_binlog_info`, but `xtrabackup_binlog_info` only contains the local server's position. The source's position is recorded in `xtrabackup_slave_info` and only when `--slave-info` is passed. Added the flag to the command.

4. **Wrong file reference for XtraBackup source position**: In the "Verifying Backup Contains Source Position" section, `xtrabackup_binlog_info` was referenced but the correct file for source position is `xtrabackup_slave_info`. Fixed the file reference.

5. **Incorrect `--throttle` description**: The post described `--throttle=100` as "Limit to 100 IO operations per second." Per Percona docs, `--throttle` limits chunks copied per second where each chunk is 10 MB — it does not control individual IOPS. Fixed the description and adjusted the value to `--throttle=10` (100 MB/s) which is a more reasonable throttle for backup workloads.

6. **Inline comment breaking bash line continuation**: The throttle command had `--throttle=100 \  # Limit to 100 IO operations per second` which is invalid bash — a comment after a `\` continuation character causes a syntax error. Moved the comment above the command.

7. **Grep pattern mismatch**: With `--source-data` on MySQL 8.0.23+, the dump output uses `CHANGE REPLICATION SOURCE TO` syntax (not `CHANGE MASTER TO`). Updated the grep in the verification section to match.

8. **Missing `set -o pipefail` in automated script**: The script checked `$?` after a `mysqldump | gzip` pipeline, but without `pipefail`, `$?` only reflects gzip's exit status. If mysqldump fails but gzip succeeds (writing a partial file), the script would incorrectly report success. Added `set -o pipefail`.

## Review Notes
- The post consistently targets MySQL 8.0.26+ syntax throughout, which is appropriate for modern deployments.
- The `--slave-info` flag in XtraBackup has not yet been aliased to `--replica-info` in PXB 8.0; the rename is expected in PXB 8.4+. The current flag name is correct for the PXB 8.0 series.
- The automated backup script uses `-p"$(cat /etc/mysql/mysql.pass)"` which is functional but will trigger a MySQL warning about passwords on the command line. A `--defaults-extra-file` or `mysql_config_editor` approach would be more secure, but this is a style preference rather than a technical error.
- The `$?` check in the automated script now works correctly with `set -o pipefail`, but a more robust approach would use `PIPESTATUS` array to check individual pipeline component exit codes.
