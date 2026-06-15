# Validation Summary: How to Recover Data with Point-in-Time Recovery in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- Write-Ahead Log (WAL) archiving
- Point-in-Time Recovery (PITR)
- pg_basebackup
- PostgreSQL recovery configuration
- pg_stat_archiver monitoring

## Sources Consulted
- PostgreSQL 18 Documentation: Continuous Archiving and Point-in-Time Recovery (PITR) - https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL 18 Documentation: Write Ahead Log configuration, archiving, archive recovery, and recovery targets - https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL 18 Documentation: pg_basebackup - https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL 18 Documentation: Cumulative Statistics System, pg_stat_archiver - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL 18 Documentation: System Administration Functions, pg_switch_wal and recovery information functions - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL 18 Documentation: ALTER SYSTEM - https://www.postgresql.org/docs/current/sql-altersystem.html

## Issues Found
- The local `archive_command` example used a plain `cp`, which can overwrite an existing archived WAL file and still report success. Changed it to test that the target file does not already exist before copying.
- The archive verification block mixed SQL and shell commands in one `sql` code fence. Split the `ls` command into a separate `bash` block.
- The multiline `pg_basebackup` example placed inline comments after line-continuation backslashes, which would make the shell command fail. Removed those inline comments from the continued command.
- The S3 streaming backup example used tar output to stdout without specifying a compatible WAL method. Added `-X fetch` so it does not rely on WAL streaming while writing tar output to stdout.
- The restore command referenced `/backups/base_2026-01-25.tar.gz`, but the earlier `pg_basebackup -Ft -z -D /backups/base_2026-01-25` examples create `base.tar.gz` inside the backup directory. Updated the extraction path.
- The recovery settings example was marked as SQL and used SQL-style comments, but the content is PostgreSQL configuration syntax. Changed the fence to `conf` and used `#` comments.
- The shell append example wrote to a PostgreSQL-owned configuration file without privilege handling. Changed it to use `sudo -u postgres tee -a`.
- The recovery drill and individual-table recovery examples created fresh base backups and then tried to recover to an earlier time, which PostgreSQL cannot do. Changed those examples to restore an existing base backup before applying WAL.
- The WAL archiving monitoring query used `pg_last_wal_receive_lsn()` as an archive lag metric, but that function is for streaming replication receive position and returns `NULL` when streaming replication has not started. Changed the query to use `now() - last_archived_time` from `pg_stat_archiver`.
- The timeline guidance suggested specifying a timeline in `restore_command`. Changed it to use the correct recovery setting, `recovery_target_timeline`.

## Review Notes
The post is technically relevant and now aligns with current PostgreSQL PITR documentation. Future improvements could mention that production retention cleanup should generally be based on backup metadata and WAL requirements rather than only filesystem modification times.
