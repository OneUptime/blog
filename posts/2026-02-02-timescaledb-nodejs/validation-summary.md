# Validation Summary: How to Use TimescaleDB with Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TimescaleDB (hypertables, continuous aggregates, compression policies, retention policies)
- TimescaleDB Toolkit (`time_weight`, `average` accessor)
- PostgreSQL (`time_bucket`, `PERCENTILE_CONT`, `DISTINCT ON`)
- Node.js
- `pg` (node-postgres) connection pooling
- Knex.js query builder
- Express.js
- Docker (TimescaleDB image)

## Sources Consulted
- TimescaleDB API docs — `time_bucket` overloads: https://docs.timescale.com/api/latest/hyperfunctions/time_bucket/
- TimescaleDB `time_bucket` SQL source: https://github.com/timescale/timescaledb/blob/main/sql/time_bucket.sql
- TimescaleDB Toolkit `time_weighted_average` docs: https://github.com/timescale/timescaledb-toolkit/blob/main/docs/time_weighted_average.md
- TimescaleDB Toolkit installation: https://github.com/timescale/timescaledb-toolkit
- TimescaleDB `chunk_compression_stats` docs source: https://github.com/timescale/docs/blob/latest/api/compression/chunk_compression_stats.md
- TimescaleDB informational views: https://docs.timescale.com/api/latest/informational-views/hypertables/, https://docs.timescale.com/api/latest/informational-views/chunks/
- Knex.js Raw docs: https://knexjs.org/guide/raw
- Knex.js issue #3304 (`?` inside string literals): https://github.com/tgriesser/knex/issues/3304
- Docker Hub `timescale/timescaledb` tags: https://hub.docker.com/r/timescale/timescaledb/tags

## Issues Found

1. **Broken Knex raw SQL — `INTERVAL '? days'`** (in `getHourlyAveragesKnex`). Knex's `?` placeholder is expanded even when it appears inside a single-quoted SQL string literal, so this pattern produces malformed SQL or a bindings-count error (knex/knex#3304). Fixed by moving the bound value outside the literal: `NOW() - (? * INTERVAL '1 day')`. Added a brief inline note explaining the pitfall.

2. **`time_bucket($N, time)` without an interval cast** (in `getAggregatedReadings`). `time_bucket` has no `(text, timestamptz)` overload, so passing a text parameter without a cast causes PostgreSQL to fail overload resolution (`function time_bucket(text, timestamptz) does not exist` / `could not determine data type of parameter`). Fixed by changing the call to `time_bucket($N::interval, time)`.

3. **`time_weight` requires the separate `timescaledb_toolkit` extension** (in `getTimeWeightedAverage`). The post's `CREATE EXTENSION timescaledb` does not install the toolkit, and the plain `timescale/timescaledb` Docker image does not bundle it. Added a comment above the example noting the dependency and where it is pre-installed (Tiger Cloud, `timescale/timescaledb-ha` image).

## Review Notes

- The Docker tag `timescale/timescaledb:latest-pg15` is still published as of 2026; `latest-pg16`/`latest-pg17`/`latest-pg18` are also available. Readers on a newer PostgreSQL version can swap the tag.
- `chunk_compression_stats()` is still supported but the TimescaleDB docs now describe it as superseded by `chunk_columnstore_stats()` under the new columnstore terminology. The post's usage remains functionally correct; a future revision could mention the newer name.
- The `is_compressed` column on `timescaledb_information.chunks` is now documented as "is the chunk in the columnstore?" — semantics unchanged.
- Several queries (`getRecentReadings`, `getHourlyStats`) interpolate JavaScript values into the SQL string with template literals (e.g. `INTERVAL '${minutes} minutes'`). With numeric internal callers this is safe in practice, but it is worth flagging as a SQL-injection risk if these helpers are ever called with unvalidated user input. The post correctly parameterizes elsewhere, so this is a minor style/safety nit rather than a correctness bug.
- Multi-row INSERT, connection-pool sizing guidance, hypertable creation, continuous-aggregate refresh policies, compression/retention policy syntax, and the `timescaledb_information.*` view columns referenced in the admin endpoint were all verified against current docs and are accurate.
