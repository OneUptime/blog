# Validation Summary: How to Use TimescaleDB with Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TimescaleDB (PostgreSQL extension)
- PostgreSQL
- Python 3
- psycopg2 (psycopg2-binary)
- asyncpg
- SQLAlchemy (ORM and Core)
- pandas
- Docker (timescale/timescaledb image)

## Sources Consulted
- TimescaleDB / Tiger Data API docs: https://docs.tigerdata.com/api/latest/
  - `timescaledb_information.hypertables` view: https://docs.tigerdata.com/api/latest/informational-views/hypertables/
  - `chunks_detailed_size`: https://docs.tigerdata.com/api/latest/hypertable/chunks_detailed_size/
  - `compress_chunk`: https://docs.tigerdata.com/api/latest/compression/compress_chunk/
  - `hypertable_compression_stats`: https://docs.tigerdata.com/api/latest/compression/hypertable_compression_stats/
  - `add_compression_policy`, `add_retention_policy`, `add_continuous_aggregate_policy`
  - `time_bucket`, `time_bucket_gapfill`, `locf`, `interpolate`
  - `refresh_continuous_aggregate` (procedure invoked via `CALL`)
- asyncpg API reference: https://magicstack.github.io/asyncpg/current/api/index.html
  - `Connection.executemany`, `copy_records_to_table`, `create_pool`
  - `PreparedStatement.executemany` (confirmed to exist)
- SQLAlchemy 2.0 docs: https://docs.sqlalchemy.org/en/20/orm/declarative_styles.html
- pandas 2.2 What's New: https://pandas.pydata.org/docs/whatsnew/v2.2.0.html (frequency alias deprecations)
- psycopg2 docs: https://www.psycopg.org/docs/usage.html (parameter passing, `execute_values`, `ThreadedConnectionPool`)

## Issues Found

1. **`timescaledb_information.hypertable_stats` view does not exist** (in `analyze_query_performance`).
   - The `timescaledb_information` schema has `hypertables`, `chunks`, `continuous_aggregates`, `policy_stats`, etc., but no `hypertable_stats` view, and no `total_bytes` / `compressed_bytes` columns there.
   - **Fix**: Rewrote the query to join `timescaledb_information.hypertables` with `hypertable_detailed_size()` and `hypertable_compression_stats()` to produce the same logical columns.

2. **`total_bytes` column does not exist on `timescaledb_information.chunks`** (in `get_chunk_info`).
   - The chunks view exposes `range_start`, `range_end`, `is_compressed`, `chunk_schema`, `chunk_name`, etc., but no size columns.
   - **Fix**: Computed per-chunk size via `pg_total_relation_size(format('%I.%I', chunk_schema, chunk_name)::regclass)`.

3. **`compress_chunk(chunk_name)` called with an unqualified text chunk name** (in `compress_chunks_manually`).
   - `compress_chunk` takes a `REGCLASS`. An unqualified chunk name will only resolve if `_timescaledb_internal` is on `search_path`, which is fragile.
   - **Fix**: Pass `format('%I.%I', chunk_schema, chunk_name)::regclass` so the chunk is fully qualified before the cast.

4. **`from sqlalchemy.ext.declarative import declarative_base` is the legacy import path**.
   - SQLAlchemy 2.0 moved `declarative_base` to `sqlalchemy.orm` (and recommends subclassing `DeclarativeBase`).
   - **Fix**: Updated the import to `from sqlalchemy.orm import declarative_base, sessionmaker` and added a short comment noting the modern `DeclarativeBase` pattern.

5. **pandas frequency alias `'1H'` was deprecated in pandas 2.2 in favor of `'1h'`** (in `resample_and_analyze` default and in `run_analysis_workflow`).
   - **Fix**: Updated both occurrences to `'1h'`.

## Review Notes

- **psycopg2 `%s` inside string literals**: Several queries use patterns like `INTERVAL '%s hours'` with an integer parameter. psycopg2 substitutes `%s` inside quoted strings as well, and integers are rendered without quotes, so the result is valid SQL (`INTERVAL '24 hours'`). It works for the integer parameters used in the post, but it is fragile — if a caller passed a string, the result would be malformed. A more idiomatic form is `NOW() - %s * INTERVAL '1 hour'` with an integer parameter, or passing the interval as a single string parameter (`INTERVAL %s` with `'24 hours'`). Left as-is to avoid expanding the scope of the fixes.
- **JSONB encoding in `copy_records_to_table`**: The async example passes a `json.dumps(...)` string for the `tags` JSONB column. Whether this works depends on whether a JSONB codec has been registered on the connection; asyncpg's default behavior treats JSONB as a text codec, so passing a JSON-serialized string usually works. Worth flagging for future revisions.
- **`add_compression_policy` defaults**: TimescaleDB recently introduced `hypercore`/columnstore terminology; the existing `add_compression_policy` API is still supported and accurate for current GA versions, so no change made.
- **SQLAlchemy 1.x-style `session.query(...)`**: Still supported in SQLAlchemy 2.0 but deprecated in favor of `select() + session.execute()`. Not changed.
- **Continuous-aggregate base used for daily rollup**: Building a daily continuous aggregate on top of the hourly continuous aggregate uses the documented "hierarchical continuous aggregates" feature (supported since TimescaleDB 2.9). Accurate as written.
- **Docker image tag `timescale/timescaledb:latest-pg15`**: Valid published tag. As of the post date, newer PostgreSQL major versions are also supported; readers may want to consider a pinned, more current tag in production.
