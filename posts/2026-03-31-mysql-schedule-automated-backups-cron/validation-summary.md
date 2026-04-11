# Validation Summary: How to Schedule Automated MySQL Backups with Cron

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (mysqldump, mysql client)
- Bash scripting
- Linux cron
- gzip compression
- find (GNU coreutils)
- mail (mailutils)

## Sources Consulted
- MySQL 8.0 Reference Manual: mysqldump (https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- MySQL 8.0 Reference Manual: mysql command options (https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html)
- MySQL 8.0 Reference Manual: option files (https://dev.mysql.com/doc/refman/8.0/en/option-files.html)
- MySQL 8.0 Reference Manual: GRANT statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- GNU Bash Manual: Pipelines and pipefail (https://www.gnu.org/software/bash/manual/bash.html#Pipelines)
- Linux man pages: crontab(5), find(1)

## Issues Found

1. **Pipeline exit status not checked correctly**: The `if [ $? -eq 0 ]` after `mysqldump | gzip` only checked gzip's exit status, not mysqldump's. A failing mysqldump (e.g., access denied, missing database) would be silently reported as success because gzip would still exit 0. Fixed by adding `set -o pipefail` at the top of the script so `$?` reflects the first non-zero exit in the pipeline.

2. **mysqldump stderr not captured to log file**: The `2>>"${LOG_FILE}"` redirect was placed on the gzip command, so only gzip's stderr was logged. mysqldump errors (connection failures, permission issues, etc.) were sent to default stderr, which is lost when run via cron. Moved the stderr redirect to the mysqldump command so its error output is captured in the log.

3. **Undefined `$BACKUP_STATUS` variable in notification snippet**: The "Sending Backup Notifications" section referenced `$BACKUP_STATUS` which was never initialized or set in the backup script. Added `BACKUP_STATUS=0` initialization in the configuration section and `BACKUP_STATUS=1` assignment in the error branch of the per-database backup loop.

## Review Notes
- The cron example references `/usr/local/bin/mysql_backup_weekly.sh` but that script is never defined in the post. This is not technically wrong (it's a placeholder showing how to add a second schedule), but readers may find it confusing.
- The `chown mysql:mysql /etc/mysql/backup.cnf` for the credentials file works because root can read any file regardless of ownership, but since the backup script runs as root, `chown root:root` would be more intuitive. Not changed as it is functionally correct.
- The `systemctl status cron` command is Debian/Ubuntu-specific. On RHEL/CentOS/Fedora systems, the service is named `crond`. The post targets Linux generically but doesn't note this distinction.
- For MySQL 8.0.21+, the `PROCESS` privilege is recommended for backup users using `--single-transaction` to avoid a warning about `FLUSH TABLES WITH READ LOCK`. The granted privileges are sufficient for the dump to succeed, but adding `PROCESS` would suppress this warning.
