# Validation Summary: How to Use TimescaleDB with PostgreSQL Extensions

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- TimescaleDB (hypertables, continuous aggregates, compression, retention policies)
- PostgreSQL (native partitioning, materialized views, EXPLAIN/ANALYZE)
- PostGIS (geometry types, GiST indexes, ST_DWithin, ST_MakeLine, ST_Centroid, etc.)
- pg_partman (range/list partitioning, `create_parent`)
- pgcrypto (`pgp_sym_encrypt`)
- pg_stat_statements
- pg_trgm, uuid-ossp, hstore (mentioned)

## Sources Consulted
- TimescaleDB / Tigerdata documentation — `chunk_compression_stats` informational view: https://docs.tigerdata.com/api/latest/informational-views/
- TimescaleDB `create_hypertable` reference: https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB continuous aggregate restrictions: https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/about-continuous-aggregates
- TimescaleDB `jobs` and `job_stats` informational views: https://www.tigerdata.com/docs/api/latest/informational-views/jobs
- pg_partman documentation (`create_parent`, partition types): https://github.com/pgpartman/pg_partman/blob/master/doc/pg_partman.md
- PostGIS reference manual for spatial function signatures

## Issues Found

1. **Outdated compression stats view name.** The post referenced `timescaledb_information.compressed_chunk_stats`, which is the legacy name. In modern TimescaleDB 2.x the view is `timescaledb_information.chunk_compression_stats`. Renamed in the compression monitoring query.

2. **Deprecated `pg_partman` `p_type` value.** The post used `p_type => 'native'` in `partman.create_parent(...)`. In pg_partman 5.x, the `'native'` value was removed; only `'range'` and `'list'` are accepted. Updated to `p_type => 'range'`.

3. **Outdated `pg_partman` interval string.** The post used `p_interval => 'monthly'`, a legacy shorthand. pg_partman 5.x expects a real PostgreSQL interval. Updated to `p_interval => '1 month'`.

4. **Unsupported continuous aggregate pattern (geofence_events).** The `geofence_events` example created a continuous aggregate using `CROSS JOIN geofences g` plus a `ST_DWithin(...)` spatial predicate. Continuous aggregates only support INNER/LEFT/LATERAL joins with equality join conditions — `CROSS JOIN` and non-equality spatial predicates are explicitly disallowed. Converted `geofence_events` to a regular materialized view (removed `WITH (timescaledb.continuous)` and replaced the `add_continuous_aggregate_policy(...)` call with a comment about scheduling `REFRESH MATERIALIZED VIEW CONCURRENTLY` via pg_cron / an external scheduler). The geofencing pattern itself is sound; only the materialization mechanism needed changing.

5. **Incorrect columns on `timescaledb_information.jobs`.** The "Background job status" query selected `last_run_status` and `last_run_started_at` from `jobs`. Those columns live in `timescaledb_information.job_stats`, not `jobs`. Rewrote the query to join `jobs` with `job_stats USING (job_id)` and aliased `js.last_start AS last_run_started_at`. The same conflation was present in the health check query's `job_health` CTE — switched it to read from `job_stats` and filter on `last_start`.

## Review Notes
- The legacy positional form `create_hypertable('table', 'time_col', chunk_time_interval => INTERVAL '1 day')` used throughout the post still works in TimescaleDB 2.18+ but is no longer the recommended style. The current recommendation is the dimension-builder form `create_hypertable('table', by_range('time_col', INTERVAL '1 day'))`, and in 2.23+ `CREATE TABLE ... WITH (tsdb.hypertable, ...)`. Left as-is since the legacy form remains supported and is widely used.
- The `device_hourly_stats` continuous aggregate uses `INNER JOIN devices d ON sr.device_id = d.device_id`, an equality join against a single non-hypertable table. This is supported on TimescaleDB 2.10+ (and many such non-hypertable joins on 2.16+). Left as-is.
- The "Extension-specific metrics" query relies on `relname = extname || '_config'` to look up an extension's config table. Most extensions (PostGIS, TimescaleDB, pg_stat_statements) do not have a relation named `<extname>_config`, so `pg_size_pretty(...)` will return NULL for those rows. Not incorrect, just produces mostly NULLs in practice; left as the author wrote it.
- The post's "Best Practices Summary" recommends installing TimescaleDB first and then other extensions. This is loosely accurate (TimescaleDB must be `shared_preload_libraries` and is usually installed first), though strictly speaking extension install order does not matter for most pairs; PostGIS in particular is independent. Not a correctness issue.
