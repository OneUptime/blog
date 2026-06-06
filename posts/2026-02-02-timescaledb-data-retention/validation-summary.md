# Validation Summary: How to Configure Data Retention Policies in TimescaleDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TimescaleDB (hypertables, chunks, retention policies, continuous aggregates, compression)
- PostgreSQL (SQL, materialized views, `pg_stat_activity`, `pg_size_pretty`)

## Sources Consulted
- TimescaleDB `add_retention_policy` API: https://www.tigerdata.com/docs/api/latest/data-retention/add_retention_policy
- TimescaleDB `drop_chunks` API: https://www.tigerdata.com/docs/api/latest/hypertable/drop_chunks
- TimescaleDB `chunks_detailed_size` API: https://www.tigerdata.com/docs/api/latest/hypertable/chunks_detailed_size
- TimescaleDB `timescaledb_information.job_stats` view: https://www.tigerdata.com/docs/api/latest/informational-views/job_stats
- TimescaleDB `timescaledb_information.job_errors` view: https://www.tigerdata.com/docs/api/latest/informational-views/job_errors

## Issues Found
1. **Monitoring Retention Policies section** — the query `SELECT chunk_schema, chunk_name, range_start, range_end, ... FROM chunks_detailed_size('sensor_metrics')` referenced columns (`range_start`, `range_end`) that `chunks_detailed_size()` does not return. Per the official docs, the function returns only `chunk_schema`, `chunk_name`, `table_bytes`, `index_bytes`, `toast_bytes`, `total_bytes`, and `node_name`. Fixed by joining `chunks_detailed_size()` with `timescaledb_information.chunks` on `(chunk_schema, chunk_name)` to obtain the range columns.

2. **Storage Estimation section** — the CTE selected `hypertable_name`, `range_start`, and `range_end` directly from `chunks_detailed_size('sensor_metrics')`. These columns are not returned by the function. Fixed by introducing a `chunk_sizes` CTE that joins `timescaledb_information.chunks` with `chunks_detailed_size()` on `(chunk_schema, chunk_name)` and selects the needed columns before aggregating.

## Review Notes
- All other API signatures verified against current TimescaleDB documentation: `add_retention_policy` (including `drop_after`, `schedule_interval`, `initial_start`, `if_not_exists`), `drop_chunks` (including `older_than`/`newer_than` as INTERVAL or timestamptz), `add_continuous_aggregate_policy`, `add_compression_policy`, `alter_job`, `run_job`, and `remove_retention_policy` are accurate.
- `timescaledb_information.jobs`, `job_stats`, `job_errors`, `chunks`, and `hypertables` views and their columns referenced in queries all exist as described.
- The `hypertable_size(regclass)` call signature is correct.
- Mermaid diagrams are conceptual illustrations; the retention/age semantics shown are consistent with how TimescaleDB drops chunks once their end boundary is older than `drop_after`.
- The post is written against modern (2.x) TimescaleDB; the note that compression requires "TimescaleDB 2.0+" is accurate.
