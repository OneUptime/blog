# Validation Summary: How to Backup TimescaleDB Databases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TimescaleDB (2.x)
- PostgreSQL (12+, with references to 15+ and 16)
- `pg_dump` / `pg_restore`
- `pg_basebackup`
- PostgreSQL Write-Ahead Logging (WAL) and continuous archiving
- Point-in-Time Recovery (PITR) via `recovery.signal` and `postgresql.auto.conf`
- TimescaleDB native compression and `add_compression_policy`
- Prometheus textfile collector for backup monitoring
- AWS S3 (optional offsite WAL storage)

## Sources Consulted
- TimescaleDB `timescaledb_information.chunks` view documentation: https://www.tigerdata.com/docs/api/latest/informational-views/chunks
- TimescaleDB `hypertable_compression_stats` / `compression_stats` view documentation: https://github.com/timescale/docs/blob/latest/api/compression/hypertable_compression_stats.md
- TimescaleDB self-hosted logical backup guide (`timescaledb_pre_restore` / `timescaledb_post_restore`): https://www.tigerdata.com/docs/self-hosted/latest/backup-and-restore/logical-backup
- PostgreSQL `pg_dump`, `pg_basebackup`, WAL archiving and PITR documentation (postgresql.org)
- PostgreSQL `wal_compression` settings (PostgreSQL 15+ release notes)

## Issues Found
1. **`timescaledb_information.chunks` column name was wrong.** The incremental chunk backup script referenced a `created` column, but the actual column on this view is `chunk_creation_time` (added in TimescaleDB 2.13). Changed both the `WHERE` and `ORDER BY` clauses to use `chunk_creation_time`.
2. **`compressed_chunk_stats` view does not exist.** The compression section used `NOT EXISTS (SELECT 1 FROM timescaledb_information.compressed_chunk_stats ...)` to skip already-compressed chunks. That view name has never been part of the TimescaleDB 2.x API. Replaced the query with the supported `compress_chunk(chunk, if_not_compressed => true)` form, which is the documented way to skip chunks that are already compressed.
3. **`compression_stats` column names were wrong.** The verification query referenced `compressed_chunks`, `before_compression_bytes`, and `after_compression_bytes`. The actual column names on `timescaledb_information.compression_stats` are `number_compressed_chunks`, `before_compression_total_bytes`, and `after_compression_total_bytes`. Updated the SELECT list and the compression-ratio computation accordingly.
4. **Restore mode was set the wrong way.** The full logical restore script used `SET timescaledb.restoring = 'on'` and `SET timescaledb.restoring = 'off'` inside `psql` heredocs. Because `SET` is session-scoped, the flag would not be visible to the subsequent `pg_restore` connection. The documented procedure is to call `SELECT timescaledb_pre_restore();` before `pg_restore` and `SELECT timescaledb_post_restore();` after. Updated the script to use these functions, which also disable/re-enable background workers as required.
5. **`pg_dump` flags listed in comments were not actually used.** The basic logical backup script described `--no-tablespaces`, `--no-owner`, and `--no-privileges` in the comments above the command, but the command itself only passed `--format=custom`. Added the three missing flags so the executed command matches the documented intent.

## Review Notes
- The PostgreSQL configuration block uses `wal_compression = zstd`, which requires PostgreSQL 15+; the inline comment correctly notes this version requirement.
- `wal_keep_size` (used in place of the older `wal_keep_segments`) correctly reflects PostgreSQL 13+ syntax.
- The PITR restore script's loop on `recovery.signal` works because PostgreSQL removes that file once recovery completes and the server is promoted; this is a fragile but valid way to detect completion. A more robust check would query `pg_is_in_recovery()` once the server is reachable.
- The pg_dump comment "`--format=custom: Enables parallel restore`" is accurate (custom format supports `pg_restore --jobs`); parallel *dump* requires directory format, which the parallel-backup script uses correctly.
- The selective-chunk-restore script demonstrates the workflow but does not actually filter `pg_restore` by the discovered chunks (it restores schema only and then queries the chunk list). This is illustrative rather than complete, but is not technically incorrect.
- TimescaleDB has been rebranded to TigerData and the documentation is now hosted at tigerdata.com (timescale.com URLs redirect). The blog still links to `timescale.com/cloud` and `docs.timescale.com`, which currently redirect cleanly; this is fine but may need refreshing in the future.
