# Validation Summary: How to Handle High-Ingestion Workloads in TimescaleDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TimescaleDB (hypertables, chunks, compression, retention policies, space partitioning)
- PostgreSQL (configuration tuning, WAL, checkpoints, parallel workers, pg_stat views)
- psycopg2 (Python driver, `execute_values` batch inserts)
- timescaledb-parallel-copy (Go CLI tool)
- PgBouncer (connection pooling, transaction mode)

## Sources Consulted
- TimescaleDB / Tiger Data API docs: `timescaledb_information.chunks` view — https://www.tigerdata.com/docs/api/latest/informational-views/chunks
- TimescaleDB / Tiger Data API docs: `chunk_compression_stats()` — https://github.com/timescale/docs/blob/latest/api/compression/chunk_compression_stats.md
- TimescaleDB / Tiger Data API docs: `hypertable_detailed_size()` — https://www.tigerdata.com/docs/api/latest/hypertable/hypertable_detailed_size
- TimescaleDB / Tiger Data API docs: `chunks_detailed_size()` — https://www.tigerdata.com/docs/api/latest/hypertable/chunks_detailed_size
- TimescaleDB / Tiger Data API docs: `add_dimension()` — https://www.tigerdata.com/docs/api/latest/hypertable/add_dimension
- TimescaleDB / Tiger Data API docs: `set_number_partitions()` — referenced via TimescaleDB API index
- TimescaleDB / Tiger Data API docs: `move_chunk()` — https://www.tigerdata.com/docs/api/latest/hypertable/move_chunk
- timescaledb-parallel-copy GitHub repo — https://github.com/timescale/timescaledb-parallel-copy
- PostgreSQL WAL configuration docs — https://www.postgresql.org/docs/current/runtime-config-wal.html

## Issues Found

1. **`timescaledb_information.chunks` query used non-existent columns.** The "Check current chunk sizes" query selected `total_bytes`, `table_bytes`, and `index_bytes` from the chunks view, but that view does not expose storage columns. Fixed by switching to `chunks_detailed_size('metrics')` and joining back to the chunks view for `range_start` / `range_end`.

2. **`chunk_compression_stats()` was selected with wrong columns.** Two queries selected `hypertable_schema`, `hypertable_name`, and `is_compressed` from this function; the function only returns chunk-level columns and uses `compression_status` (text: `'Compressed'` / `'Uncompressed'`) instead of `is_compressed`. Fixed both queries — removed the non-existent columns and replaced `WHERE is_compressed = true` with `WHERE compression_status = 'Compressed'`.

3. **`compress_chunk(i.chunk_name::regclass)` would fail at runtime.** `chunk_name` in `timescaledb_information.chunks` is unqualified, so casting it to `regclass` only resolves when `_timescaledb_internal` is in `search_path`. Fixed by using `format('%I.%I', i.chunk_schema, i.chunk_name)::regclass`.

4. **`hypertable_detailed_size()` queries selected `hypertable_name` and `num_chunks`.** This function returns only `table_bytes`, `index_bytes`, `toast_bytes`, `total_bytes`, `node_name`. Fixed both the "Monitor insert rate" query and the `ingestion_dashboard` view by driving them from `timescaledb_information.hypertables` (which provides `hypertable_name` and `num_chunks`) and using `CROSS JOIN LATERAL hypertable_detailed_size(...)` for the storage figures.

5. **`ALTER TABLE metrics SET (synchronous_commit = off)` is invalid.** `synchronous_commit` is a `PGC_USERSET` GUC, not a table storage parameter, so this statement raises an error. Fixed by switching to a session-level `SET synchronous_commit = off;` with a comment explaining the scope.

6. **`add_dimension('metrics', 'device_id', number_partitions => 8)` was called a second time on the same column.** `add_dimension` raises `column 'device_id' is already a dimension` when re-called. Fixed by switching to `SELECT set_number_partitions('metrics', 8, 'device_id');`, which is the supported way to change partition count for an existing space dimension.

## Review Notes
- The `pg_stat_bgwriter` query uses `buffers_clean` and `buffers_backend`, which were removed from `pg_stat_bgwriter` in PostgreSQL 17 (moved to `pg_stat_io` / `pg_stat_checkpointer`). The query is correct for PG 13–16; readers on PG 17+ should consult `pg_stat_io`. Not changed because the post does not declare a target PG version and the query still works on currently most-deployed versions.
- The `metadata JSONB` column is inserted as a Python `dict` via `execute_values`. This relies on psycopg2's automatic dict→jsonb adaptation, which works out of the box for `psycopg2` ≥ 2.7. Acceptable for a tutorial.
- The recommendation "shared_buffers = 25% of RAM, effective_cache_size = 75% of RAM" matches standard PostgreSQL tuning guidance.
- `timescaledb-parallel-copy` install path and `--reporting-period` flag verified against the official repo.
- `move_chunk()` signature (`chunk`, `destination_tablespace`, `index_destination_tablespace`) matches docs.
