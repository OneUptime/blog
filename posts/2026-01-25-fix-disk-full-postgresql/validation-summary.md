# Validation Summary: How to Fix 'disk full' Errors in PostgreSQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL
- SQL
- PostgreSQL configuration
- Linux shell commands
- Disk monitoring and log rotation

## Sources Consulted
- PostgreSQL VACUUM documentation: https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL WAL configuration documentation: https://www.postgresql.org/docs/current/wal-configuration.html
- PostgreSQL runtime WAL settings: https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL CHECKPOINT documentation: https://www.postgresql.org/docs/current/sql-checkpoint.html
- PostgreSQL logging configuration documentation: https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL table partitioning documentation: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL CREATE TABLE documentation: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL continuous archiving and PITR documentation: https://www.postgresql.org/docs/current/continuous-archiving.html

## Issues Found
- The post suggested manually removing old WAL files from `pg_wal`. This is unsafe because PostgreSQL needs WAL for crash recovery, archiving, and replication. I changed the guidance to force a checkpoint when possible, inspect WAL growth, and investigate failed archiving, replication slot lag, or `wal_keep_size` instead.
- The article implied disk-full errors can directly cause data corruption. PostgreSQL is designed to PANIC/shut down rather than silently corrupt data when WAL cannot be written, so I softened the wording to failed transactions and server shutdown.
- The temporary-file cleanup command targeted `/var/lib/postgresql/14/main/pgsql_tmp/*`, which is not the usual temporary file location for database-local temp files. I changed it to search under `base/*/pgsql_tmp/*` and clarified that stale temp files should only be removed when PostgreSQL is stopped.
- The post treated `backup_label*` files as generic backup files that could be removed. These files can affect PostgreSQL recovery semantics, so I replaced the deletion commands with a warning to remove them only when recovering from a failed exclusive backup and the implications are understood.
- The post recommended `wal_keep_size = 1GB` while saying this reduced retention on servers without replication. Because `wal_keep_size` retains WAL for standbys and defaults to no extra retention, I changed the no-replication example to `wal_keep_size = 0` and `wal_keep_segments = 0` for PostgreSQL 12 and earlier.
- The `max_wal_size` description was too absolute. PostgreSQL documents it as a soft limit that can be exceeded under heavy load, archive failures, or high WAL retention settings, so I updated the wording.
- The checkpoint comment overstated its effect. I changed it to say checkpoints can let PostgreSQL recycle or remove WAL files that are no longer needed.
- The `REINDEX INDEX CONCURRENTLY` comment said it "does not lock". PostgreSQL still uses locking, but avoids blocking normal reads and writes, so I corrected the comment.
- The log rotation comment implied `log_truncate_on_rotation` overwrites old logs generally. PostgreSQL only truncates same-named files on time-based rotation, so I corrected the comment.
- The emergency recovery section suggested moving `pg_wal`. I replaced that with guidance to add or mount storage or move non-PostgreSQL files, and explicitly warned not to delete or move `pg_wal` files.
- The emergency `VACUUM FULL` step omitted that `VACUUM FULL` requires extra disk space while rewriting tables. I added that caveat.

## Review Notes
The remaining SQL examples are syntactically valid for supported PostgreSQL versions, but several operational steps are intentionally simplified. In production, WAL growth should be diagnosed with archiver status, replication slots, standby lag, and backup tooling before changing retention settings.
