# Validation Summary: How to Create Hypertables in TimescaleDB

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- TimescaleDB (hypertables, chunks, compression, retention, continuous aggregates)
- PostgreSQL (CREATE TABLE, indexes, pg_stat_user_indexes, COPY)
- SQL (DDL, DML, time_bucket, named function arguments)
- Ubuntu/Debian package management (apt, packagecloud repository)

## Sources Consulted
- [Tiger Data Documentation — create_hypertable() (legacy)](https://www.tigerdata.com/docs/api/latest/hypertable/create_hypertable_old)
- [Tiger Data Documentation — chunk_compression_stats()](https://www.tigerdata.com/docs/api/latest/compression/chunk_compression_stats)
- [Tiger Data Documentation — add_continuous_aggregate_policy()](https://www.tigerdata.com/docs/api/latest/continuous-aggregates/add_continuous_aggregate_policy)
- [Tiger Data Documentation — drop_chunks()](https://www.tigerdata.com/docs/api/latest/hypertable/drop_chunks)
- [Tiger Data Documentation — hypertable_size()](https://www.tigerdata.com/docs/api/latest/hypertable/hypertable_size)
- TimescaleDB GitHub test fixtures for `create_hypertable` parameter usage

## Issues Found
1. **Incorrect compression stats source.** The "Check compression savings" query selected from `timescaledb_information.compressed_chunk_stats`, which is not a real view in current TimescaleDB. The supported way to retrieve per-chunk compression byte counters is the set-returning function `chunk_compression_stats(<hypertable>)`. Fixed by replacing the `FROM timescaledb_information.compressed_chunk_stats WHERE hypertable_name = 'sensor_data'` clause with `FROM chunk_compression_stats('sensor_data')`. The selected columns (`before_compression_total_bytes`, `after_compression_total_bytes`, `chunk_name`) are returned by this function, so the rest of the query is unchanged.

## Review Notes
- The `create_hypertable('table', 'time', partitioning_column => ..., number_partitions => ..., chunk_time_interval => ..., migrate_data => ...)` interface used throughout the post is marked deprecated as of TimescaleDB 2.13.0 in favor of the new `CREATE TABLE ... WITH (tsdb.hypertable, ...)` / `by_range()`/`by_hash()` dimension-info API. It still works and produces the documented results, so no changes were made, but readers on the latest TimescaleDB releases will see deprecation notices and may want to adopt the new API.
- The Ubuntu install snippet uses `apt-key add`, which is deprecated on Ubuntu 22.04+ in favor of writing the key to `/etc/apt/keyrings/` and referencing it via `signed-by=` in the source list. The command still works on most systems with a warning; left as-is since the post's audience and target distros are not specified.
- The "25–100 GB per chunk" rule of thumb is more aggressive than TimescaleDB's classic guidance (chunks that fit within ~25% of available RAM together with their indexes). For very large memory systems this can be reasonable, but smaller deployments typically aim lower. This is a sizing opinion rather than a factual error, so it was not changed.
- The multi-granularity `time_bucket` example (grouping by minute, hour and day in the same query) is syntactically valid but somewhat contrived — the smaller bucket already determines the larger ones. Left as-is since it is not technically incorrect.
- All other API references (`add_retention_policy`, `add_compression_policy`, `add_continuous_aggregate_policy` with `start_offset` > `end_offset`, `drop_chunks` with `older_than`, `hypertable_size`, `timescaledb_information.hypertables`/`chunks`, `pg_stat_user_indexes`, `time_bucket` with origin) were verified against current TimescaleDB documentation and are accurate.
