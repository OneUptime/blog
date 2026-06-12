# Validation Summary: How to Use TimescaleDB Continuous Aggregates

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- TimescaleDB (continuous aggregates, hypertables, compression)
- PostgreSQL (materialized views, aggregate functions)
- `timescaledb_toolkit` extension (`percentile_agg`, `approx_percentile`)
- TimescaleDB information schema views (`continuous_aggregates`, `jobs`, `job_stats`)
- TimescaleDB policy APIs (`add_continuous_aggregate_policy`, `add_compression_policy`)

## Sources Consulted
- TimescaleDB official docs — Continuous aggregates: https://docs.timescale.com/use-timescale/latest/continuous-aggregates/
- TimescaleDB API reference — `chunk_compression_stats`: https://docs.timescale.com/api/latest/compression/chunk_compression_stats/
- TimescaleDB API reference — `add_continuous_aggregate_policy`: https://docs.timescale.com/api/latest/continuous-aggregates/add_continuous_aggregate_policy/
- TimescaleDB Toolkit — Percentile approximation: https://docs.timescale.com/use-timescale/latest/hyperfunctions/percentile-approx/
- TimescaleDB CHANGELOG (2.13.0 default change for `materialized_only`): https://github.com/timescale/timescaledb/blob/main/CHANGELOG.md
- TimescaleDB 2.9.0 release notes (hierarchical continuous aggregates): https://github.com/timescale/timescaledb/releases/tag/2.9.0
- TimescaleDB `job_stats` informational view: https://www.tigerdata.com/docs/reference/timescaledb/informational-views/job_stats

## Issues Found

1. **`PERCENTILE_CONT` inside continuous aggregate definitions (two places: `system_metrics_1m`, `api_stats_5m`)** — Ordered-set / hypothetical-set aggregates such as `PERCENTILE_CONT(...) WITHIN GROUP (ORDER BY ...)` are NOT supported in continuous aggregates because PostgreSQL cannot parallelize aggregates with `ORDER BY`/`DISTINCT`. The view would fail to create. Fixed by switching both examples to `percentile_agg(...)` from the `timescaledb_toolkit` extension (stores a UDDSketch sketch) plus a sample query showing how to read the percentile back via `approx_percentile(...)`. Also added `CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;`.

2. **`timescaledb_information.continuous_aggregate_stats` view does not exist in TimescaleDB 2.x** — This view (and the `completed_threshold`/`invalidation_threshold` columns) belonged to the pre-2.0 API and was removed when the job framework was unified. Fixed by replacing the query with a join of `timescaledb_information.jobs` and `timescaledb_information.job_stats` filtered on `proc_name = 'policy_refresh_continuous_aggregate'`.

3. **`chunk_compression_stats(...)` columns** — The function does not return `hypertable_name` or `compression_ratio`. The actual columns are `chunk_schema`, `chunk_name`, `compression_status`, `before_compression_*_bytes`, `after_compression_*_bytes`, and `node_name`. Fixed by replacing the wrong columns with real ones and computing the ratio inline as `ROUND(before_compression_total_bytes::numeric / NULLIF(after_compression_total_bytes, 0), 2)`.

4. **"Real-time aggregation (default in TimescaleDB 2.0+)"** — Outdated since TimescaleDB **2.13.0** (Dec 2023), which flipped the default of `timescaledb.materialized_only` to `true` (i.e., real-time aggregation is OFF by default for new continuous aggregates). Fixed by adding a note clarifying that since 2.13 you must explicitly opt in to real-time aggregation.

5. **Best practice #8 ("Use PERCENTILE_CONT sparingly")** — Misleading: `PERCENTILE_CONT` is not just expensive, it is unsupported inside a continuous aggregate. Rewrote the bullet to say so explicitly and recommend `percentile_agg` / `approx_percentile` from `timescaledb_toolkit`.

## Review Notes

- The rest of the SQL (hypertable creation, `create_hypertable`, `CREATE MATERIALIZED VIEW ... WITH (timescaledb.continuous)`, `WITH NO DATA`, `refresh_continuous_aggregate(...)`, `add_continuous_aggregate_policy(...)` with `start_offset`/`end_offset`/`schedule_interval`, hierarchical CAGGs introduced in 2.9, `remove_continuous_aggregate_policy(...)`, `ALTER MATERIALIZED VIEW ... SET (timescaledb.compress = true)`, `add_compression_policy(... , compress_after => ...)`, and `DROP MATERIALIZED VIEW ... CASCADE`) all check out against current documentation.
- The columns selected from `timescaledb_information.continuous_aggregates` (`view_name`, `view_definition`, `materialized_only`, `compression_enabled`) are all valid.
- `chunk_compression_stats()` is technically superseded by `chunk_columnstore_stats()` in the very latest TimescaleDB versions, but the legacy function still works and is widely used — no change needed.
- The note that you must drop and recreate to change the underlying query (add columns, change buckets) is correct: `ALTER MATERIALIZED VIEW` for a continuous aggregate only changes settings, not the SELECT.
- Performance numbers in the comparison table are illustrative ranges rather than verifiable benchmarks — acceptable as such.
