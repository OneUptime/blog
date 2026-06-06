# Validation Summary: How to Use TimescaleDB with Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TimescaleDB (PostgreSQL extension, v2.x)
- PostgreSQL 15
- Grafana (latest stable, with built-in PostgreSQL data source)
- Docker / Docker Compose
- SQL (continuous aggregates, hypertables, compression, retention policies)
- `pg_stat_statements`
- `timescaledb-tune`

## Sources Consulted
- TimescaleDB API reference: `chunk_compression_stats` (https://docs.timescale.com/api/latest/compression/chunk_compression_stats/)
- TimescaleDB informational views: `timescaledb_information.chunks` (https://docs.timescale.com/api/latest/informational-views/chunks/)
- TimescaleDB API reference: `chunks_detailed_size` (https://docs.timescale.com/api/latest/hypertable/chunks_detailed_size/)
- TimescaleDB self-hosted install docs for Ubuntu/Debian (apt + packagecloud)
- TimescaleDB continuous aggregate docs (`add_continuous_aggregate_policy`, `refresh_continuous_aggregate`)
- TimescaleDB compression / retention policy docs (`add_compression_policy`, `add_retention_policy`)
- Grafana official APT install docs (apt.grafana.com, `/etc/apt/keyrings/grafana.gpg`)
- PostgreSQL `pg_stat_statements` docs (confirmed `total_exec_time` / `mean_exec_time` columns for PG13+)
- PostgreSQL `pg_available_extensions` view

## Issues Found

1. **Invalid column `compression_ratio` in `chunk_compression_stats()`** — The compression stats query selected a `compression_ratio` column that does not exist on the function's return type. The function only returns `before_compression_*` and `after_compression_*` byte counters; the ratio must be computed by the caller.
   - **Fix:** Replaced the bare `compression_ratio` column with a computed expression: `ROUND(before_compression_total_bytes::numeric / NULLIF(after_compression_total_bytes, 0), 2) AS compression_ratio`. This preserves the author's intent and the column name while making the query actually execute.

2. **Invalid column `total_bytes` on `timescaledb_information.chunks`** — The "check chunk sizes" troubleshooting query selected `pg_size_pretty(total_bytes)` from `timescaledb_information.chunks`, but that view exposes only metadata (schema/name/dimension/range/is_compressed/tablespace/creation_time) and has no size column. The query would error with "column total_bytes does not exist".
   - **Fix:** Joined the view to the `chunks_detailed_size('metrics')` function (which does return a `total_bytes` bigint per chunk) on `chunk_schema` + `chunk_name`. This produces the same output the author intended without inventing columns.

## Review Notes

- **Random index expressions** — The sample-data INSERT uses `(ARRAY[...])[1 + (random() * 3)::int]` and similar. PostgreSQL's `::int` cast performs banker's rounding, so `random()*3` (range `[0, 3)`) can round up to `3`, giving array indices `1..4`. The 4-element metric array and 3-element region array are both indexed safely under this distribution. Verified correct.
- **`docker-compose` `version: '3.8'` field** — Still functional, though the Compose Specification has deprecated the top-level `version` key. Modern compose files typically omit it. Not a correctness issue, just slightly dated style.
- **`apt-key`-style key install** — The TimescaleDB section uses `/etc/apt/trusted.gpg.d/timescaledb.gpg` rather than the now-preferred `/etc/apt/keyrings/` + `signed-by=` pattern (which the Grafana section in the same post does use). Both work on current Debian/Ubuntu, but for consistency the TimescaleDB block could be updated in a future revision.
- **TimescaleDB → TigerData rebrand** — TimescaleDB's official docs now redirect from `docs.timescale.com` to `tigerdata.com/docs/...`. The post still uses the "TimescaleDB" name throughout; the product name itself remains TimescaleDB so this is not incorrect, but worth noting for future posts.
- **Continuous aggregate syntax** — `CREATE MATERIALIZED VIEW ... WITH (timescaledb.continuous) ... WITH NO DATA;` plus `add_continuous_aggregate_policy(...)` and `CALL refresh_continuous_aggregate(...)` all match TimescaleDB 2.x. Verified.
- **`pg_stat_statements` column names** — `total_exec_time` / `mean_exec_time` are the PostgreSQL 13+ names (previously `total_time` / `mean_time`). Consistent with the post's PG15 baseline.
