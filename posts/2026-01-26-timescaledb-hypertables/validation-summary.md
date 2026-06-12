# Validation Summary: How to Design TimescaleDB Hypertables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TimescaleDB hypertables
- PostgreSQL SQL and indexing
- TimescaleDB chunking and dimensions
- TimescaleDB Hypercore columnstore compression
- TimescaleDB retention policies
- TimescaleDB continuous aggregates
- TimescaleDB information views and background jobs

## Sources Consulted
- TimescaleDB hypertables and chunks reference: https://docs.timescale.com/api/latest/hypertable/
- TimescaleDB `create_hypertable()` current API: https://www.tigerdata.com/docs/reference/timescaledb/hypertables/create_hypertable
- TimescaleDB `create_hypertable()` old interface deprecation notes: https://docs.timescale.com/api/latest/hypertable/create_hypertable_old/
- TimescaleDB `add_dimension()` reference: https://docs.timescale.com/api/latest/hypertable/add_dimension/
- TimescaleDB `set_chunk_time_interval()` reference: https://docs.timescale.com/api/latest/hypertable/set_chunk_time_interval/
- TimescaleDB Hypercore `add_columnstore_policy()` reference: https://docs.timescale.com/api/latest/hypercore/add_columnstore_policy/
- TimescaleDB `chunk_columnstore_stats()` reference: https://www.tigerdata.com/docs/api/latest/hypercore/chunk_columnstore_stats
- TimescaleDB `hypertable_columnstore_stats()` reference: https://www.tigerdata.com/docs/api/latest/hypercore/hypertable_columnstore_stats
- TimescaleDB `timescaledb_information.dimensions` view: https://docs.timescale.com/api/latest/informational-views/dimensions/
- TimescaleDB `timescaledb_information.chunks` view: https://www.tigerdata.com/docs/api/latest/informational-views/chunks
- TimescaleDB `chunks_detailed_size()` reference: https://docs.timescale.com/api/latest/hypertable/chunks_detailed_size/
- TimescaleDB `hypertable_detailed_size()` reference: https://www.tigerdata.com/docs/api/latest/hypertable/hypertable_detailed_size
- TimescaleDB `timescaledb_information.jobs`, `job_stats`, and `job_errors` views: https://docs.timescale.com/api/latest/informational-views/jobs/
- TimescaleDB data retention policy reference: https://docs.timescale.com/api/latest/data-retention/add_retention_policy/

## Issues Found
- The post used the deprecated `create_hypertable('table', 'time', ...)` old interface throughout. Updated examples to the current dimension-builder syntax with `by_range(...)` and `by_hash(...)`.
- Space partitioning examples used deprecated `partitioning_column` and `number_partitions` arguments in `create_hypertable`. Changed them to create the time dimension first, then add a hash dimension with `add_dimension(..., by_hash(...))`.
- The distributed hypertable example used `create_distributed_hypertable`, which was sunsetted in TimescaleDB 2.14.x. Replaced it with a note to use current scaling approaches instead.
- The chunk interval verification query joined `timescaledb_information.dimensions` to `timescaledb_information.hypertables` using columns that do not exist in the current views. Simplified it to query `timescaledb_information.dimensions` directly.
- Compression examples used the old compression settings and policy API while the latest documentation uses Hypercore columnstore APIs. Updated examples to `timescaledb.enable_columnstore`, `timescaledb.segmentby`, `timescaledb.orderby`, and `CALL add_columnstore_policy(...)`.
- Compression monitoring selected a non-existent `compression_ratio` column. Replaced it with an explicit percentage calculation using current `chunk_columnstore_stats()` and `hypertable_columnstore_stats()` output columns.
- Chunk size monitoring selected `total_bytes` from `timescaledb_information.chunks`, which is metadata-only and does not include size columns. Joined it with `chunks_detailed_size()` for size data.
- The hypertable size example selected `hypertable_name` from `hypertable_detailed_size()`, but that function returns only size columns plus `node_name`. Added a literal hypertable name in the projection.
- The IoT location index comment said PostgreSQL `POINT` GiST indexing requires PostGIS. Corrected it to refer to PostgreSQL's built-in `POINT` type.
- Removed `percentile_cont` from the continuous aggregate example to avoid relying on ordered-set aggregate behavior in TimescaleDB continuous aggregates.

## Review Notes
The chunk interval row targets remain practical rules of thumb rather than official limits. The post now avoids deprecated TimescaleDB APIs for new examples, but TimescaleDB version behavior still varies around Hypercore defaults, especially for self-hosted releases before 2.20 and before 2.23.
