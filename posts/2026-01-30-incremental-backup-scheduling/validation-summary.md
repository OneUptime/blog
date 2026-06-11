# Validation Summary: How to Create Incremental Backup Scheduling

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- PostgreSQL WAL archiving and point-in-time recovery
- PostgreSQL `pg_basebackup`
- PostgreSQL recovery configuration
- Bash scripting
- Cron scheduling
- Python backup scheduling and monitoring scripts
- AWS S3 CLI usage in examples

## Sources Consulted
- PostgreSQL documentation: Continuous Archiving and Point-in-Time Recovery (PITR) - https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL documentation: `pg_basebackup` - https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL documentation: Write Ahead Log configuration - https://www.postgresql.org/docs/current/runtime-config-wal.html
- Python documentation: `subprocess` - https://docs.python.org/3/library/subprocess.html
- GNU Bash Reference Manual: `shopt` builtin and `nullglob` - https://www.gnu.org/software/bash/manual/html_node/The-Shopt-Builtin.html

## Issues Found
- The example `archive_command` overwrote existing archived WAL files with `cp`. Updated it to test that the target file does not already exist before copying, matching PostgreSQL's documented safe pattern.
- The WAL archive manager script stated it could be used by `archive_command`, but the configuration did not show how to call it. Added a commented `archive_command` example for the script.
- The WAL archive verification loop would treat the literal `*.gz` pattern as a file when no compressed WAL files existed. Added `shopt -s nullglob` so an empty archive directory does not produce a false corruption error.
- The Python scheduler imported `field` but did not use it. Removed the unused import while adding `sys` for command-line argument handling.
- The Python scheduler configured `full_backup_day = 0` while the cron example and comments scheduled full backups on Sunday. Changed the default to `6`, which is Sunday for Python's `datetime.weekday()`.
- The cron examples invoked `backup_scheduler.py full` and `backup_scheduler.py incremental`, but the Python script ignored command-line arguments. Added explicit `full`, `incremental`, and `scheduled` action handling.
- The incremental backup function always used the latest full backup as the parent and copied WAL files modified since that full backup. That behaved like a differential backup. Added lookup of the latest completed backup and used that for parent metadata and the WAL copy window.
- The restoration workflow diagram implied manually applying each incremental backup separately. For WAL archive based PITR, PostgreSQL replays required WAL through `restore_command`; simplified the diagram to stage required WAL archives before PITR.
- The restore script could fail if the restore directory did not exist. Added `mkdir -p "${RESTORE_DIR}"` before extraction.
- The restore script used `cp` for WAL restore even though the WAL archive manager compresses files with gzip. Updated `restore_command` to use `gunzip` for `.gz` archives and fall back to `cp` for uncompressed archives, preserving `%f` and `%p` positional arguments correctly.

## Review Notes
- PostgreSQL 18 also supports built-in incremental base backups with `pg_basebackup --incremental` and `pg_combinebackup`. This post's examples use WAL archive based incremental recovery rather than PostgreSQL's newer block-level incremental backup flow, which is still a valid strategy but worth clarifying in a future broader revision.
- The scripts are examples and still need environment-specific hardening before production use, especially around credentials, permissions, tablespaces, retention dependencies, and end-to-end restore testing.
