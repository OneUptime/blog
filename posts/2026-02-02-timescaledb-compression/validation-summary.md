# Validation Summary: How to Compress Data in TimescaleDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TimescaleDB (native compression, hypertables, chunks, policies)
- PostgreSQL (DDL, views, PL/pgSQL DO blocks, pg_stat_statements, pg_locks)
- Continuous aggregates
- SQL information schema views (`timescaledb_information.*`)
- Compression stats functions (`hypertable_compression_stats`, `chunk_compression_stats`)

## Sources Consulted
- TimescaleDB API reference for compression: https://www.tigerdata.com/docs/api/latest/compression/
- `add_compression_policy` reference: https://www.tigerdata.com/docs/api/latest/compression/add_compression_policy
- `timescaledb_information.chunks` view: https://www.tigerdata.com/docs/api/latest/informational-views/chunks
- `timescaledb_information.compression_settings` view: https://www.tigerdata.com/docs/api/latest/informational-views/compression_settings
- `timescaledb_information.jobs`, `job_stats`, `job_errors` views: https://www.tigerdata.com/docs/api/latest/informational-views/
- `hypertable_compression_stats` / `chunk_compression_stats` function reference (TigerData/TimescaleDB docs)

## Issues Found

1. **`timescaledb_information.chunks` used for compression byte sizes (multiple queries).**
   The post repeatedly queried `before_compression_total_bytes` and `after_compression_total_bytes` from `timescaledb_information.chunks`. These columns do not exist on that view; they are only returned by the `hypertable_compression_stats()` and `chunk_compression_stats()` functions. Affected blocks:
   - "Compression Statistics Query" — rewrote to call `hypertable_compression_stats('metrics')` directly.
   - "Per-Chunk Compression Details" — rewrote to join `timescaledb_information.chunks` with `chunk_compression_stats('metrics')` so `range_start` / `range_end` are still available.
   - "Monitoring Dashboard Query" — rewrote `compression_dashboard` to use a `LATERAL` call to `hypertable_compression_stats(...)`.
   - "Poor Compression Ratios" — rewrote to read from `chunk_compression_stats('metrics')` with `compression_status = 'Compressed'`.

2. **`compress_after` column referenced on `timescaledb_information.compression_settings`.**
   The `compression_settings` view only exposes segmentby/orderby configuration, not the policy threshold. Replaced the query with one that reads `config->>'compress_after'` from `timescaledb_information.jobs` where `proc_name = 'policy_compression'`, and kept a separate `SELECT * FROM timescaledb_information.compression_settings` to inspect segmentby/orderby.

3. **`show_chunks` EXCEPT `chunk_name` type mismatch.**
   The "Find all uncompressed chunks" query did `SELECT show_chunks(...) EXCEPT SELECT chunk_name FROM timescaledb_information.chunks`. `show_chunks` returns `regclass` (schema-qualified) while `chunk_name` is bare text, so the comparison cannot match (and the types are incompatible). Replaced with a direct query of `timescaledb_information.chunks` filtered by `is_compressed = false`, returning the schema-qualified name via `format('%I.%I', chunk_schema, chunk_name)`.

## Review Notes
- The `ALTER TABLE ... SET (timescaledb.compress, timescaledb.compress_segmentby, timescaledb.compress_orderby, ...)` syntax used throughout the post is still valid. As of TimescaleDB 2.18+, the same configuration can be expressed via `timescaledb.enable_columnstore = true` and equivalent columnstore-named options, but the existing `timescaledb.compress*` form continues to work and is widely deployed. No change made.
- Likewise, `ALTER MATERIALIZED VIEW ... SET (timescaledb.compress = true)` on a continuous aggregate remains supported. No change made.
- `timescaledb_information.job_errors` is still a valid view (since 2.12.0); no rename to `job_history` has occurred — left as-is.
- `add_compression_policy('metrics', INTERVAL '7 days', schedule_interval => ..., initial_start => ...)` is correct; the parameters exist on the function.
- The compression-algorithm-by-data-type table (Delta-of-delta for timestamps, Delta for integers, Gorilla for floats, Dictionary for low-cardinality text, LZ4 wrapping) is a fair approximation of TimescaleDB's compression scheme. Not fully exhaustive (TimescaleDB also uses Simple-8b and array compression), but accurate at the level discussed.
- The headline "90–95% storage reduction" claim is in line with TimescaleDB's published benchmarks for typical time-series workloads.
