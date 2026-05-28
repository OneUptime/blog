# Validation Summary: How to Export Data from Cloud SQL Using pg_dump and pg_restore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- PostgreSQL `pg_dump`
- PostgreSQL `pg_restore`
- Cloud SQL Auth Proxy
- PostgreSQL SSL/TLS connections
- Google Cloud Storage / `gsutil`
- Bash scripting

## Sources Consulted
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore` documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL `GRANT` documentation: https://www.postgresql.org/docs/current/sql-grant.html
- PostgreSQL libpq connection string documentation: https://www.postgresql.org/docs/current/libpq-connect.html
- Google Cloud SQL Auth Proxy documentation for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Google Cloud SQL PostgreSQL connection documentation: https://docs.cloud.google.com/sql/docs/postgres/connect-admin-ip
- Google Cloud SQL PostgreSQL SSL/TLS certificate documentation: https://docs.cloud.google.com/sql/docs/postgres/configure-ssl-instance
- Google Cloud SQL PostgreSQL extensions documentation: https://docs.cloud.google.com/sql/docs/postgres/extensions

## Issues Found
- The public IP SSL `pg_dump` example mixed explicit `--dbname=mydb` with a positional libpq connection string containing only SSL parameters. I changed it to use a single libpq connection string containing SSL, host, port, user, and database parameters, matching PostgreSQL and Cloud SQL connection-string examples.
- The parallel restore explanation implied each worker simply restores a different table and claimed a 100 GB restore could go from hours to minutes. I revised it to match `pg_restore` behavior: parallel jobs run time-consuming steps such as data loading, index creation, and constraint creation, and actual speedup depends on target resources.
- The permission example granted `USAGE` on sequences but omitted schema `USAGE` and sequence `SELECT`, which are commonly required for dump users reading tables and sequence values. I added `GRANT USAGE ON SCHEMA public` and changed the sequence grant to `SELECT, USAGE`.
- The extension-check command used `gcloud sql instances describe --format="json(settings.databaseFlags)"`, which shows database flags, not supported or available PostgreSQL extensions. I replaced it with a `pg_available_extensions` query against the target database.
- The scheduled export script checked `$?` after a pipeline, which would only report the status of `gsutil cp` in normal Bash behavior. I added `set -euo pipefail` and moved the pipeline into the `if` condition so `pg_dump` failures are not hidden.
- The cleanup comment said it kept the last 30 days, but the command keeps the latest 30 export objects. I corrected the comment.

## Review Notes
The post is technically relevant and the main `pg_dump` / `pg_restore` flags are current. Local PostgreSQL client binaries were not installed in the review environment, so command validation was performed against official PostgreSQL and Google Cloud documentation rather than local `--help` output.
