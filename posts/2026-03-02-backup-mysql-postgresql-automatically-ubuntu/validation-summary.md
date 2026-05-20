# Validation Summary: How to Back Up MySQL and PostgreSQL Databases Automatically on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Bash
- Cron
- MySQL / MariaDB
- mysqldump
- PostgreSQL
- pg_dump, pg_dumpall, pg_restore, psql
- gzip
- GNU findutils
- rsync
- rclone

## Sources Consulted
- MySQL Reference Manual: mysqldump, option syntax, and option files: https://dev.mysql.com/doc/mysql/en/mysqldump.html
- MySQL Reference Manual: using option files: https://dev.mysql.com/doc/refman/8.4/en/option-files.html
- MySQL Reference Manual: privileges provided by MySQL: https://dev.mysql.com/doc/refman/en/privileges-provided.html
- PostgreSQL Documentation: pg_dump: https://www.postgresql.org/docs/17/app-pgdump.html
- PostgreSQL Documentation: pg_dumpall: https://www.postgresql.org/docs/17/app-pg-dumpall.html
- PostgreSQL Documentation: pg_restore: https://www.postgresql.org/docs/17/app-pgrestore.html
- PostgreSQL Documentation: SQL dump backup method: https://www.postgresql.org/docs/17/backup-dump.html
- PostgreSQL Documentation: password file format and permissions: https://www.postgresql.org/docs/17/libpq-pgpass.html
- PostgreSQL Documentation: predefined roles including pg_read_all_data: https://www.postgresql.org/docs/17/predefined-roles.html
- GNU findutils manual: find expressions, time tests, -printf, and -delete: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- POSIX crontab manual: crontab field format: https://man7.org/linux/man-pages/man1/crontab.1p.html
- Local command help on Ubuntu environment: GNU findutils 4.9.0 and gzip help output

## Issues Found
- The MySQL backup script described `SHOW GRANTS;` as backing up global MySQL grants and plugins. That command records grants for the current MySQL account, not all accounts or plugins, so the comment and log message were changed to say it records grants for the account used by the script.
- The PostgreSQL `.pgpass` creation example said it created the file for root while running `sudo -u postgres nano ~/.pgpass`. The command could expand `~` before `sudo` and target the wrong home directory. It now uses `/var/lib/postgresql/.pgpass` explicitly and clarifies that `.pgpass` is for TCP/password authentication as a dedicated role, not for the later `sudo -u postgres` script path.
- The backup monitoring script used `find ... -newer /tmp`, which compares backup files to the modification time of the `/tmp` directory instead of checking all matching backup files. The `-newer /tmp` predicate was removed so the script finds the newest matching backup and then compares its age to the 25-hour threshold.

## Review Notes
The core dump and restore commands use valid current options according to MySQL and PostgreSQL documentation. The PostgreSQL script runs as the postgres operating-system user, which is appropriate for complete local backups and for `pg_dumpall --globals-only`. The MySQL script assumes conventional database names without whitespace because it iterates over command output with shell word splitting; this is common in examples but could be hardened in a future revision.
