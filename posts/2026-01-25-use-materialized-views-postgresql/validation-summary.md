# Validation Summary: How to Use Materialized Views in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL materialized views
- PostgreSQL SQL syntax
- PostgreSQL indexes
- PostgreSQL system catalog views
- pg_cron
- Bash and psql

## Sources Consulted
- PostgreSQL 18 documentation: CREATE MATERIALIZED VIEW - https://www.postgresql.org/docs/current/sql-creatematerializedview.html
- PostgreSQL 18 documentation: REFRESH MATERIALIZED VIEW - https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
- PostgreSQL 18 documentation: Materialized Views - https://www.postgresql.org/docs/current/rules-materializedviews.html
- PostgreSQL 18 documentation: pg_matviews - https://www.postgresql.org/docs/current/view-pg-matviews.html
- pg_cron official README - https://github.com/citusdata/pg_cron

## Issues Found
- Clarified the requirement for `REFRESH MATERIALIZED VIEW CONCURRENTLY`: PostgreSQL requires at least one unique index that uses only column names and includes all rows. The post previously said only "Requires a unique index," which was incomplete.
- Updated the refresh trade-off table from "No blocking" to "Allows reads during refresh" to more accurately reflect PostgreSQL's documented behavior for concurrent refresh.
- Added a unique index to the conditional refresh example before using `REFRESH MATERIALIZED VIEW CONCURRENTLY`, so the example satisfies PostgreSQL's concurrent refresh requirement.
- Renamed the "Incremental Refresh Pattern" section to "Conditional Refresh Pattern" and adjusted the description because the example avoids unnecessary full refreshes; it does not perform true incremental refresh.
- Made the materialized view size query schema-safe by using `format('%I.%I', schemaname, matviewname)::regclass` instead of string concatenation.
- Changed the generic logged refresh procedure to use standard `REFRESH MATERIALIZED VIEW` instead of `CONCURRENTLY`, because the procedure does not ensure that every target view has the qualifying unique index required for concurrent refresh.
- Adjusted the best-practice wording about stacked views because stacking materialized views supports staged refresh schedules, but does not provide native partial refresh.

## Review Notes
The post is technically relevant and the main PostgreSQL materialized view syntax is current. pg_cron examples match the documented `cron.schedule`, `cron.unschedule`, and `cron.job` usage, but real deployments also require pg_cron server setup such as `shared_preload_libraries` and PostgreSQL restart before `CREATE EXTENSION pg_cron` works.
