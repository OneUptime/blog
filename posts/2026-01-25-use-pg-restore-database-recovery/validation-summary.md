# Validation Summary: How to Use pg_restore for Database Recovery in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pg_restore
- pg_dump
- pg_basebackup and WAL archive recovery
- Bash shell commands
- SQL verification queries

## Sources Consulted
- PostgreSQL 18 documentation: pg_restore - https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL 18 documentation: pg_dump - https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL 18 documentation: Continuous Archiving and Point-in-Time Recovery - https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL 18 documentation: Write Ahead Log / Recovery settings - https://www.postgresql.org/docs/current/runtime-config-wal.html

## Issues Found
- The "Continue on errors" comment implied `--no-acl --no-owner` controlled error continuation. PostgreSQL's default `pg_restore` behavior is already to continue and report an error count unless `--exit-on-error` is used, so the comment was changed to describe the actual command.
- The selective restore example said `pg_restore -t users -I idx_users_email` restores "table and its indexes." PostgreSQL documents that `-t` does not automatically include subsidiary objects such as indexes, so the comment was corrected to "table and a specific index."
- The missing roles section described `--role=myuser` as ownership remapping. PostgreSQL's `--role` issues `SET ROLE` after connecting; it does not rewrite ownership metadata from the archive. The example now combines `--no-owner` with `--role=myuser`.
- The foreign-key troubleshooting section suggested `--single-transaction` as a fix for foreign key violations. It does not fix violations; it makes the restore atomic and rolls back on error. The comment was corrected.
- The point-in-time recovery example used `pg_restore` on a dump file as the base backup. PostgreSQL PITR requires a file-system-level base backup plus WAL archives; logical `pg_dump` archives cannot be used for WAL replay. The example was updated to show restoring a base backup into `PGDATA`, configuring `restore_command` and `recovery_target_time`, and creating `recovery.signal`.
- The selective table recovery script piped a default `pg_dump -t` into an existing production table after `TRUNCATE`, which would include schema commands and likely fail because the table already exists. The pipeline now uses `pg_dump --data-only`.
- The performance tuning section used `ALTER SYSTEM SET synchronous_commit = off` without reloading before `pg_restore`, so the restore would not use the changed setting. It also used `SET maintenance_work_mem` in a separate `psql` session, which would not affect `pg_restore`. Both examples were changed to use `PGOPTIONS` for the restore session.
- The parallel restore guidance said to use the maximum parallel jobs matching CPU cores. PostgreSQL's documentation recommends starting near the number of CPU cores but notes that the optimal value depends on hardware and too-high values can hurt performance. The wording was corrected.

## Review Notes
- PostgreSQL client binaries were not installed in the local environment, so command behavior was verified against current official PostgreSQL documentation rather than local `--help` output.
- The article is now technically accurate for current supported PostgreSQL versions, with the important caveat that PITR is cluster-level recovery and is separate from `pg_restore` logical dump recovery.
