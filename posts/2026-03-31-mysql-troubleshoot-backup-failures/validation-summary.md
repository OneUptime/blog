# Validation Summary: How to Troubleshoot MySQL Backup Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (mysqldump)
- Percona XtraBackup
- Bash scripting
- mysqlcheck

## Sources Consulted
- MySQL 8.0 Reference Manual: mysqldump options (https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- MySQL 8.0 Reference Manual: GRANT statement and privilege list (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL 8.0 Reference Manual: mysqlcheck (https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html)
- MySQL 8.0 Reference Manual: mysql client --execute option (https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html#option_mysql_execute)
- Percona XtraBackup 8.0 Documentation (https://docs.percona.com/percona-xtrabackup/8.0/)
- Bash Reference Manual: Pipelines and pipefail (https://www.gnu.org/software/bash/manual/bash.html#Pipelines)

## Issues Found

### 1. Incorrect backup verification commands (Verifying Backup Integrity section)
**What was wrong:** Two commands were incorrect:
- `mysqlcheck --check --all-databases` checks the live database tables, not the backup file. The comment misleadingly said "Test restore to a separate MySQL instance" but the command did not do that.
- `mysql -u root -p --silent --execute "SET foreign_key_checks=0;" < /backups/full.sql` does not verify the backup. The `--execute` flag causes mysql to run only the given statement and exit immediately, ignoring standard input entirely. The piped backup file would never be read.

**What was changed:** Replaced with two correct verification approaches:
1. A `tail`/`grep` check to verify the dump file ends with the "Dump completed" marker (detecting truncated backups).
2. A proper test restore command (`mysql -u root -p test_restore_db < /backups/full.sql`) that actually imports the backup into a test database.

### 2. Pipeline exit code not captured correctly (Automating and Alerting section)
**What was wrong:** The script used `$?` after `mysqldump ... | gzip > file`. In bash, `$?` returns the exit code of the last command in the pipeline (gzip), not mysqldump. If mysqldump fails but gzip completes successfully, the failure would go completely undetected.

**What was changed:** Added `set -o pipefail` at the top of the script. This bash option causes the pipeline to return the exit status of the rightmost command that fails, ensuring a mysqldump failure is properly caught by the `$?` check.

## Review Notes
- The `FLUSH PRIVILEGES` after `GRANT` is unnecessary in MySQL 5.7+ when using `GRANT` statements (the server updates the in-memory grant tables automatically), but it is not harmful and is a common practice, so it was left as-is.
- The `--innodb-log-file-size` XtraBackup flag is valid for XtraBackup 8.0 but was deprecated in XtraBackup 8.0.35+ alongside MySQL 8.0.30's deprecation of `innodb_log_file_size` in favor of `innodb_redo_log_capacity`. This is noted but not changed since the post does not target a specific version.
- The `PROCESS` privilege is sometimes recommended for mysqldump with `--single-transaction` (needed for `SHOW ENGINE INNODB STATUS`), but it is not strictly required for basic dumps, so the privilege list was left as-is.
