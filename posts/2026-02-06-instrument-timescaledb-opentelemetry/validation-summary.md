# Validation Summary: How to Instrument TimescaleDB with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- TimescaleDB
- PostgreSQL
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- OpenTelemetry database semantic conventions
- psycopg2
- OTLP

## Sources Consulted
- OpenTelemetry Collector PostgreSQL receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/postgresqlreceiver
- OpenTelemetry Collector PostgreSQL receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/postgresqlreceiver/metadata.yaml
- OpenTelemetry Collector SQL Query receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/sqlqueryreceiver
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python psycopg2 instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/psycopg2/psycopg2.html
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry PostgreSQL semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/postgresql/
- TimescaleDB informational view: chunks: https://docs.tigerdata.com/api/latest/informational-views/chunks/
- TimescaleDB informational view: jobs: https://docs.tigerdata.com/api/latest/informational-views/jobs/
- TimescaleDB informational view: job_stats: https://docs.timescale.com/api/latest/informational-views/job_stats/
- TimescaleDB informational view: continuous_aggregates: https://docs.tigerdata.com/api/latest/informational-views/continuous_aggregates/
- TimescaleDB hypertable_columnstore_stats function: https://docs.tigerdata.com/api/latest/hypercore/hypertable_columnstore_stats/
- TimescaleDB hypertable_size function: https://docs.tigerdata.com/api/latest/hypertable/hypertable_size/
- PostgreSQL predefined roles: https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html

## Issues Found
- The architecture diagram said the Collector used `pg_stat_statements` for the base PostgreSQL receiver path. The PostgreSQL receiver collects standard PostgreSQL statistics by default; `pg_stat_statements` is only used for optional top query collection. Changed the diagram label to `pg_stat views`.
- The custom TimescaleDB metric script used `UpDownCounter` instruments for current chunk counts. Repeated collection would accumulate values instead of reporting the current point-in-time value. Changed those instruments to synchronous gauges and replaced `.add()` calls with `.set()`.
- The compression ratio query joined `timescaledb_information.compression_settings` to `hypertable_compression_stats()` in a way that could duplicate rows and used the old compression stats API. Replaced it with `hypertable_columnstore_stats()` over `timescaledb_information.hypertables`, with a proper qualified `regclass` argument.
- The continuous aggregate freshness query selected `view_schema`, `view_name`, and `last_run_finished_at` from joined job views where those columns are not available in that form. Joined `timescaledb_information.continuous_aggregates` and used `job_stats.last_successful_finish`.
- The background job query referenced `js.last_run_finished_at`, which is not a documented `timescaledb_information.job_stats` column. Replaced it with `js.last_successful_finish` and added the missing `datetime` import for the snippet.
- The application span examples used deprecated or incorrect database semantic attributes such as `db.system`, `db.operation`, and `db.sql.table`, and set `db.system` to `timescaledb`. Updated them to current attributes: `db.system.name`, `db.operation.name`, and `db.collection.name`, with `postgresql` as the DB system and TimescaleDB details as custom `timescaledb.*` attributes.
- The hypertable health query returned a pretty-printed size string while describing gauge metric export. Changed it to return `total_size_bytes` and added the explicit `regclass` cast required by TimescaleDB's size function.

## Review Notes
- The PostgreSQL receiver is part of the OpenTelemetry Collector Contrib distribution, not the core-only Collector distribution.
- `hypertable_columnstore_stats()` is current for TimescaleDB 2.18 and later. Older TimescaleDB deployments may still use `hypertable_compression_stats()`.
- The Python snippets were parsed with Python `ast` for syntax validation, but SQL snippets were reviewed against current official documentation rather than executed against a live TimescaleDB instance.
