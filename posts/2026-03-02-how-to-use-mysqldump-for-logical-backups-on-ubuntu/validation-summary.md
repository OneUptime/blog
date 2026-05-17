# Validation Summary: How to Use mysqldump for Logical Backups on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- MySQL (server and client)
- mysqldump (logical backup utility)
- Ubuntu (host OS)
- bash (scripting, cron)
- gzip / xz (compression)
- pv (pipe progress monitoring)
- cron / `/etc/cron.d`

## Sources Consulted
- MySQL 8.0 Reference Manual — mysqldump options: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — Privileges Provided by MySQL: https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual — CREATE USER / GRANT syntax: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual — option files / `--defaults-file`: https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- MySQL 8.0 Reference Manual — `--single-transaction` behavior with non-transactional tables
- Percona XtraBackup documentation (for the physical-backup reference)

## Issues Found
- **Restore command used the read-only backup user.** The first restore example invoked `mysql --defaults-file=/etc/mysql/backup.cnf myapp_db < /backup/myapp_db.sql`, but the backup user was created with only `SELECT, SHOW VIEW, RELOAD, LOCK TABLES, EVENT, TRIGGER, REPLICATION CLIENT`. None of those allow `INSERT`, `CREATE`, or `DROP`, so the restore would fail at the first DDL/DML statement in the dump. Changed it to `mysql -u root -p myapp_db < /backup/myapp_db.sql` and added an inline note that a write-capable account (not the backup user) is required for restores. All subsequent restore commands in the post already used root, so no further edits were needed.

## Review Notes
- `--triggers` and `--extended-insert` are both enabled by default in mysqldump (via `--opt`). Specifying them explicitly is harmless and arguably makes intent clearer, so the examples are left as written.
- `FLUSH PRIVILEGES` after `CREATE USER` / `GRANT` is not required in modern MySQL — the in-memory grant tables are updated immediately by those DDL statements. It is only needed when directly modifying the `mysql.*` privilege tables with `INSERT`/`UPDATE`/`DELETE`. Leaving it in is not incorrect, just unnecessary.
- `REPLICATION CLIENT` is still a valid (non-deprecated) static privilege in MySQL 8.0. The newer dynamic `REPLICATION_SLAVE_ADMIN` privilege is complementary, not a replacement.
- The retention `find` command in the backup script uses `-maxdepth 1 -type d` without `-mindepth 1`, so the `BACKUP_DIR` itself is included in the candidates. In practice the parent's mtime is updated each time a new dated subdirectory is created, so it rarely matches `-mtime +N`, but adding `-mindepth 1` would be a safer guard. Not technically broken, so left as-is per the "only fix technical errors" guideline.
- The advice to prefer `xtrabackup` (Percona XtraBackup) for larger databases is accurate; the 10 GB threshold is a reasonable rule of thumb, not a hard MySQL limit.
