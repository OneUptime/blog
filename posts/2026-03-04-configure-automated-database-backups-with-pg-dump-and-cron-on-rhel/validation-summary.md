# Validation Summary: How to Configure Automated Database Backups with pg_dump and Cron on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- PostgreSQL
- pg_dump
- pg_dumpall
- pg_restore
- cron
- .pgpass/libpq password files
- logrotate
- mail/mailx

## Sources Consulted
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL pg_dumpall documentation: https://www.postgresql.org/docs/current/app-pg-dumpall.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL libpq password file documentation: https://www.postgresql.org/docs/current/libpq-pgpass.html
- Red Hat Enterprise Linux automated tasks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/html/system_administration_guide/automated_tasks
- crontab(5) manual page from the local system
- logrotate(8) manual page: https://man7.org/linux/man-pages/man8/logrotate.8.html
- mailx(1p) manual page: https://www.man7.org/linux/man-pages/man1/mailx.1p.html

## Issues Found
- The backup script claimed that `DATABASES="all"` could be used to back up every database, but the script did not implement that behavior and would instead try to dump a database literally named `all`. Changed the comment to describe only the supported list-of-databases behavior.
- The cron verification command used `sudo crontab -u postgres -l`, which checks the postgres user's personal crontab and does not show jobs installed under `/etc/cron.d`. Changed it to inspect `/etc/cron.d/pg_backup`, matching the installation method used in the post.
- The script logs to `/var/log/pg_backup.log` while running as the `postgres` user, but the post did not create a writable log file. Added commands to create the log file and assign it to `postgres:postgres`.
- The restore verification created the test database from the default template. PostgreSQL's pg_restore documentation recommends using `template0` for an initially empty restore target, so the command now uses `createdb -T template0 test_restore`.
- The logrotate example could rotate away the postgres-owned log without recreating a file that the `postgres` user can write. Added `create 0640 postgres postgres` so logrotate recreates the log with the correct ownership and permissions.

## Review Notes
The pg_dump custom-format usage, pg_dumpall globals-only command, .pgpass permissions, system cron file format, pg_restore usage, and logrotate directives are technically valid. The article remains a logical-backup tutorial; future improvements could mention that pg_dump is not a substitute for physical backups and WAL archiving when point-in-time recovery is required.
