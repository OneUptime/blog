# Validation Summary: How to Implement Downsampling in TimescaleDB

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- TimescaleDB (continuous aggregates, hypertables, compression, retention policies)
- PostgreSQL (SQL DDL/DML, PL/pgSQL functions and DO blocks)
- Time-series data modeling and downsampling

## Sources Consulted
- TimescaleDB API reference — `CREATE MATERIALIZED VIEW` for continuous aggregates: https://www.tigerdata.com/docs/api/latest/continuous-aggregates/create_materialized_view/
- TimescaleDB docs — Hierarchical continuous aggregates: https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/hierarchical-continuous-aggregates
- TimescaleDB docs — Real-time aggregates: https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/real-time-aggregates
- TimescaleDB docs — Compression on continuous aggregates: https://docs.tigerdata.com/use-timescale/latest/continuous-aggregates/compression-on-continuous-aggregates/
- TimescaleDB informational views: `job_history`, `job_stats`, `continuous_aggregates`, `jobs` — https://www.tigerdata.com/docs/api/latest/informational-views/
- TimescaleDB compression function `chunk_compression_stats`: https://docs.timescale.com/api/latest/compression/chunk_compression_stats/
- TimescaleDB hyperfunctions — percentile approximation: https://docs.tigerdata.com/use-timescale/latest/hyperfunctions/percentile-approx/

## Issues Found

1. **Obsolete view `timescaledb_information.compressed_chunk_stats`** (Compression with Downsampling section): This view does not exist in TimescaleDB 2.x. Replaced the query with the current `chunk_compression_stats('sensor_metrics')` function and updated `hypertable_name` to `chunk_schema` (the actual return column on the function).

2. **Obsolete view `timescaledb_information.continuous_aggregate_stats`** (Monitoring Downsampling Jobs section): This view and its `completed_threshold` column were removed when TimescaleDB moved from 1.x to 2.x. Replaced the freshness-monitoring query with a join across `continuous_aggregates`, `jobs`, and `job_stats` using `last_successful_finish` — the modern way to track refresh lag.

3. **Incorrect column names on `timescaledb_information.job_history`** (Monitoring Downsampling Jobs section): The post referenced `started_at`, `finished_at`, and `data`. The actual columns are `start_time`, `finish_time`, and `config`. Renamed all three in the failed-jobs query.

## Review Notes

- **`PERCENTILE_CONT WITHIN GROUP` in continuous aggregates** is supported (TimescaleDB 2.7+) and will not error. For high-cardinality workloads, the Toolkit's `percentile_agg` / `approx_percentile` is the recommended scalable alternative, but the exact form used in the post is valid.
- **`FIRST(value, time)` in hierarchical continuous aggregates** has a known accuracy bug (timescale/timescaledb#5341). The post only uses `FIRST`/`LAST` in the plain (non-hierarchical) `sensor_metrics_daily` aggregate, so it is unaffected.
- **`timescaledb.materialized_only = false` syntax** is still correct in current versions; the default flipped to `true` in 2.13+, but the option name is unchanged.
- The hierarchical aggregate example correctly uses `time_bucket('1 hour', bucket)` from a 1-minute parent (multiple-of constraint satisfied).
- All policy `proc_name` values (`policy_refresh_continuous_aggregate`, `policy_retention`) and the `job_stats` columns used elsewhere are correct.
