# Validation Summary: How to Implement Automated Backups with pg_dump in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pg_dump
- pg_restore
- pg_dumpall
- libpq .pgpass authentication
- Bash scripting
- AWS CLI S3 sync
- Google Cloud Storage gsutil
- cron
- systemd timers

## Sources Consulted
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL pg_dumpall documentation: https://www.postgresql.org/docs/current/app-pg-dumpall.html
- PostgreSQL password file documentation: https://www.postgresql.org/docs/current/libpq-pgpass.html
- PostgreSQL GRANT documentation: https://www.postgresql.org/docs/current/sql-grant.html
- PostgreSQL ALTER DEFAULT PRIVILEGES documentation: https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html
- PostgreSQL predefined roles documentation: https://www.postgresql.org/docs/current/predefined-roles.html
- AWS CLI s3 sync command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- Google Cloud Storage copy documentation: https://docs.cloud.google.com/storage/docs/copying-renaming-moving-objects
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd.timer documentation: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- crontab(5) manual: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- The backup user default privileges covered future tables but not future sequences. Added `ALTER DEFAULT PRIVILEGES ... GRANT SELECT ON SEQUENCES` and clarified that default privileges apply to objects created by the current role.
- The `.pgpass` example only included the read-only backup user, but the production script also dumps global objects. Added a matching placeholder entry for the global-dump role.
- The production script used shell word splitting for the database list, which would mishandle database names containing whitespace. Replaced it with `mapfile` and `psql -At`, then iterated over the resulting array.
- The production script used the read-only backup user for `pg_dumpall --globals-only`, which is not sufficient for a complete global object dump in typical PostgreSQL installations. Added `PGGLOBALUSER` and used it for the global backup step.
- The `pg_dumpall` command was not checked, so global-object backup failures could exit early under `set -e` or be omitted from the summary. Wrapped it in an `if` block and marked the backup as failed when it does not succeed.
- The notification helper used `echo` with escaped newlines, which is not portable across shells and can send literal `\n` text. Replaced it with `printf '%b\n'`.
- The retention cleanup command could delete the backup root directory itself when its mtime exceeded the retention period. Added `-mindepth 1` so only timestamped child directories are removed.
- The S3 and GCS upload snippets used `YYYYMMDD` paths, but the production backup script creates `YYYYMMDD_HHMMSS` directories. Updated both snippets to locate the latest timestamped backup from the current date and fail clearly if none exists.

## Review Notes
- The pg_dump format descriptions, `-Fc`, `-Fd`, `-Ft`, `-j`, `pg_restore --list`, `.pgpass` permissions, cron schedule format, and systemd timer syntax were verified against current official documentation.
- The post remains a logical-backup guide. For point-in-time recovery or very large clusters, a future post could discuss physical backups, WAL archiving, and managed backup tooling.
