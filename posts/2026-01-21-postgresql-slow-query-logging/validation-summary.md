# Validation Summary: How to Set Up PostgreSQL Slow Query Logging

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL logging configuration
- PostgreSQL pg_stat_statements
- PostgreSQL auto_explain
- pgBadger
- Prometheus alerting

## Sources Consulted
- PostgreSQL 18 documentation: Error Reporting and Logging - https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL 18 documentation: auto_explain - https://www.postgresql.org/docs/current/auto-explain.html
- PostgreSQL 18 documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- pgBadger official documentation: Incremental Reports - https://pgbadger.darold.net/documentation.html
- prometheus-community postgres_exporter documentation and source - https://github.com/prometheus-community/postgres_exporter

## Issues Found
- pg_stat_statements was shown with only `CREATE EXTENSION pg_stat_statements;`. PostgreSQL documentation requires the module to be loaded through `shared_preload_libraries`, so the recommended `shared_preload_libraries` setting was changed to include both `pg_stat_statements` and `auto_explain`.
- The pgBadger incremental example omitted the required output directory. Added `-O /var/www/pg_reports/` to match pgBadger's documented incremental mode.
- The Prometheus alert expression and summary implied a slow-query count rate, but `pg_stat_statements_seconds_total` is cumulative execution time exported by postgres_exporter's stat_statements collector. Updated the expression to aggregate the rate and changed the summary to "High query execution time detected."

## Review Notes
- The Prometheus example assumes prometheus-community postgres_exporter is running with the `stat_statements` collector enabled; PostgreSQL itself does not expose this metric directly.
- Enabling `auto_explain.log_analyze` adds overhead because it records execution details. This is technically valid but should be used carefully in production.
