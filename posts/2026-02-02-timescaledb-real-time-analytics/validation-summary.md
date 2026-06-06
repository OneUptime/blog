# Validation Summary: How to Implement Real-Time Analytics with TimescaleDB

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- TimescaleDB 2.x (PostgreSQL extension)
- PostgreSQL 15
- TimescaleDB Toolkit extension (percentile_agg, approx_percentile, rollup)
- Hypertables, continuous aggregates, compression/retention policies
- Docker (timescale/timescaledb image)
- Node.js (pg, pg-copy-streams, Express)
- Python (asyncpg, FastAPI, asyncio)

## Sources Consulted
- TimescaleDB / Tiger Data docs — Create a continuous aggregate: https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/create-a-continuous-aggregate
- TimescaleDB docs — About continuous aggregates: https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/about-continuous-aggregates
- TimescaleDB docs — Hierarchical continuous aggregates: https://docs.timescale.com/use-timescale/latest/continuous-aggregates/hierarchical-continuous-aggregates/
- TimescaleDB API — add_continuous_aggregate_policy: https://www.tigerdata.com/docs/api/latest/continuous-aggregates/add_continuous_aggregate_policy
- TimescaleDB API — chunk_compression_stats: https://docs.timescale.com/api/latest/compression/chunk_compression_stats/
- TimescaleDB API — continuous_aggregates view: https://docs.timescale.com/api/latest/informational-views/continuous_aggregates/
- TimescaleDB API — job_stats view: https://docs.timescale.com/api/latest/informational-views/job_stats/
- TimescaleDB API — create_hypertable (and legacy form): https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB Toolkit — percentile_agg: https://docs.timescale.com/api/latest/hyperfunctions/percentile-approximation/percentile_agg/
- Release notes confirming DISTINCT/FILTER support in CAGGs added in 2.7: https://www.tigerdata.com/blog/how-we-made-data-aggregation-better-and-faster-on-postgresql-with-timescaledb-2-7

## Issues Found

1. **Unsupported subquery inside continuous aggregate (`pageview_analytics_hourly`).**
   The original `bounced_sessions` column used `COUNT(DISTINCT session_id) FILTER (WHERE session_id IN (SELECT ... FROM events GROUP BY ...))`. TimescaleDB explicitly forbids subqueries (and CTEs) in continuous aggregate view definitions — the `FROM` must reference a single hypertable and nothing else. `CREATE MATERIALIZED VIEW ... WITH (timescaledb.continuous)` would have failed. Removed the offending column and added a note that bounce rate should be computed at query time against the CAGG. (`DISTINCT` and `FILTER` themselves are fine in CAGGs since v2.7 — only the subquery was the problem.)

2. **`timescaledb_information.compressed_chunk_stats` does not exist.**
   In TimescaleDB 2.x, per-chunk compression sizing is exposed via the set-returning function `chunk_compression_stats('<hypertable>')` rather than the old 1.x view. Replaced the query with `FROM chunk_compression_stats('metrics')`, also dropped the `hypertable_name` column (the function is already scoped to one hypertable) and switched to `chunk_schema` to match the function's actual output columns.

3. **`timescaledb_information.continuous_aggregate_stats` does not exist.**
   This view was removed in the 2.x line. The replacement is a join across `continuous_aggregates`, `jobs` (filtered to `proc_name = 'policy_refresh_continuous_aggregate'`), and `job_stats`. Rewrote the query to use that pattern.

4. **`timescaledb_information.jobs` was selecting columns that live on `job_stats`.**
   The original "compression job failures" query pulled `last_run_status`, `last_run_started_at`, and `total_failures` from `jobs`, but those columns are on `job_stats`. Also replaced `application_name LIKE 'Compression%'` with the more reliable `proc_name = 'policy_compression'` filter and added the join on `job_id`.

5. **`timescaledb_information.chunks` was selecting `total_bytes`, which doesn't exist.**
   The `chunks` view exposes range metadata but no size column. Rewrote the chunk-size query to compute on-disk size with `pg_total_relation_size(format('%I.%I', chunk_schema, chunk_name)::regclass)`. Also dropped the `SUM(total_bytes)/AVG(total_bytes)` columns from the monitoring query for the same reason.

6. **Missing prerequisite: `timescaledb_toolkit` extension.**
   The post uses `percentile_agg`, `approx_percentile`, and `rollup`, all of which live in `timescaledb_toolkit` (a separate extension that is not enabled by default and not bundled with every TimescaleDB image). Added `CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;` to the "Enabling the Extension" section with a one-line note explaining why.

7. **Misleading comment on `WITH NO DATA`.**
   The original comment said `WITH NO DATA` "include[s] data up to 1 hour ago (allows for late-arriving data)" — that's not what the clause does. `WITH NO DATA` only skips backfilling existing rows when the CAGG is created. Corrected the comment.

## Review Notes
- The legacy `create_hypertable('metrics', 'time', chunk_time_interval => ...)` signature is still supported but is now considered the "old interface"; the modern API uses dimension builders like `by_range('time', INTERVAL '1 day')`. Left as-is because the legacy form is still valid and widely used.
- `datetime.utcnow()` in the Python example emits a `DeprecationWarning` on Python 3.12+ (recommended replacement: `datetime.now(timezone.utc)`). Functionally still works; left as-is to avoid scope creep.
- FastAPI's `@app.on_event("startup" / "shutdown")` is deprecated in favor of the lifespan context manager pattern, but still functional. Left as-is.
- The introductory sentence "Unlike materialized views, they automatically refresh as new data arrives" is slightly loose — CAGGs refresh on a schedule via a background policy, not on every insert. Functionally close enough that I did not rewrite it.
- The Docker tag `timescale/timescaledb:latest-pg15` is still published and valid, though newer PG versions (pg16, pg17) are also available. Left as-is since the post explicitly calls out PG 15.
