# Validation Summary: How to Use TimescaleDB for IoT Data

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- TimescaleDB 2.x (hypertables, continuous aggregates, compression, retention policies)
- PostgreSQL (SQL DDL/DML, `pg_stat_statements`, `pg_total_relation_size`, `COPY`)
- TimescaleDB Toolkit (`time_weight`, `average` accessor)
- Node.js (`pg` connection pool, `mqtt` client)
- MQTT (broker, topic wildcards)
- Mermaid diagrams (flowchart syntax)

## Sources Consulted
- TimescaleDB API docs — Hypertables view: https://docs.timescale.com/api/latest/informational-views/hypertables/
- TimescaleDB API docs — Chunks view: https://docs.timescale.com/api/latest/informational-views/chunks/
- TimescaleDB API docs — Continuous aggregates view: https://docs.timescale.com/api/latest/informational-views/continuous_aggregates/
- TimescaleDB API docs — Jobs / job_stats views
- TimescaleDB API docs — Continuous aggregates restrictions (PERCENTILE_CONT support added in 2.7)
- TimescaleDB Toolkit — `time_weight` / `average` accessor
- TimescaleDB API docs — `hypertable_detailed_size()`, `chunks_detailed_size()`, `chunk_compression_stats()`
- node-postgres (`pg`) `Pool` configuration documentation
- PostgreSQL docs — `pg_stat_statements` (`total_exec_time` column name)

## Issues Found

1. **Incorrect `timescaledb_information` view name and columns (monitoring section).**
   The post queried `timescaledb_information.hypertable` (singular). The actual TimescaleDB 2.x view is `hypertables` (plural). The query also selected `table_size`, `index_size`, `toast_size`, `total_size`, and `compression_ratio` — none of which are columns of that view. **Fixed** by rewriting the query to join `timescaledb_information.hypertables` with `hypertable_detailed_size()` (which returns `table_bytes`, `index_bytes`, `toast_bytes`, `total_bytes`) and formatting via `pg_size_pretty()`.

2. **`timescaledb_information.chunks` does not expose `total_bytes`.**
   The chunks-monitoring query referenced `pg_size_pretty(total_bytes)` against the view, but the view has no `total_bytes` column. **Fixed** by computing chunk size with `pg_total_relation_size(format('%I.%I', chunk_schema, chunk_name)::regclass)`.

3. **`timescaledb_information.continuous_aggregates` does not have `refresh_lag` or `max_interval_per_refresh` columns.**
   Those columns do not exist in TimescaleDB 2.x — refresh policy/runtime metrics live in `timescaledb_information.jobs` and `timescaledb_information.job_stats`. **Fixed** by replacing the query with a join across `continuous_aggregates`, `jobs` (filtered on `proc_name = 'policy_refresh_continuous_aggregate'`), and `job_stats` to surface `last_run_started_at`, `last_successful_finish`, `last_run_status`, `total_successes`, and `total_failures`.

## Review Notes

- **PERCENTILE_CONT inside continuous aggregates** is shown in the hourly stats view. This was a TimescaleDB limitation historically (ordered-set aggregates were disallowed), but support was added in **TimescaleDB 2.7+**. The post is correct for current versions; readers on pre-2.7 deployments would hit an error and should prefer the Toolkit `percentile_agg`/`approx_percentile` pattern.
- **`time_weight('Linear', time, value)` + `average(...)`** requires the TimescaleDB Toolkit extension (`CREATE EXTENSION timescaledb_toolkit;`). The post does not mention this prerequisite — readers may want to be aware before running Query 4.
- **`FIRST(value, time)` / `LAST(value, time)`** are TimescaleDB-provided aggregates (not standard PostgreSQL); these are core TimescaleDB and not Toolkit-dependent, which is correct as used.
- The Node.js batching example is sound: `pg.Pool` API, parameterized multi-row INSERT, and `mqtt.connect` / topic-wildcard subscription all match current library APIs.
- `pg_stat_statements.total_exec_time` is the correct column name for PostgreSQL 13+ (renamed from `total_time`); the query is valid on modern Postgres.
- The Mermaid `flowchart` syntax used in both diagrams is valid.
- The opening quote attributed to "Ajay Kulkarni, Co-founder of Timescale" — Ajay Kulkarni is indeed a Timescale co-founder; the quote itself was not independently verified but the attribution is plausible.
