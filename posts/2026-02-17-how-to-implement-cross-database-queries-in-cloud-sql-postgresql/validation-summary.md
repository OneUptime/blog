# Validation Summary: How to Implement Cross-Database Queries in Cloud SQL PostgreSQL

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- PostgreSQL
- dblink
- postgres_fdw
- PostgreSQL materialized views
- pg_cron
- Python asyncpg

## Sources Consulted
- Google Cloud SQL for PostgreSQL extension documentation: https://docs.cloud.google.com/sql/docs/postgres/extensions
- PostgreSQL postgres_fdw documentation: https://www.postgresql.org/docs/17/postgres-fdw.html
- PostgreSQL dblink documentation: https://www.postgresql.org/docs/16/dblink.html
- PostgreSQL REFRESH MATERIALIZED VIEW documentation: https://www.postgresql.org/docs/17/sql-refreshmaterializedview.html
- pg_cron project documentation: https://github.com/citusdata/pg_cron
- asyncpg API documentation: https://magicstack.github.io/asyncpg/current/api/index.html

## Issues Found
- The dblink and postgres_fdw examples used `host=localhost` / `host 'localhost'` for same-instance Cloud SQL cross-database connections. Cloud SQL documentation states that same-instance inter-database connections cannot use `localhost` or `127.0.0.1`; they must use the instance IP shown in Google Cloud. Updated those examples to use `CLOUD_SQL_INSTANCE_IP`.
- The materialized view example created a non-unique index and then used `REFRESH MATERIALIZED VIEW CONCURRENTLY`. PostgreSQL requires at least one unique index on the materialized view for concurrent refresh. Changed the index to `CREATE UNIQUE INDEX` and added a short note.
- The pg_cron example enabled the extension without mentioning the required Cloud SQL database flag. Added a comment that `cloudsql.enable_pg_cron` must be set to `on` before enabling the extension.
- The Python asyncpg example used `datetime.date` and `datetime.timedelta` without importing `datetime`. Added the missing import.
- The Python example said it connected to both databases concurrently but awaited the two connections sequentially. Updated the connection setup to use `asyncio.gather`.

## Review Notes
The remaining examples are syntactically consistent with PostgreSQL and asyncpg documentation. In production, credentials for dblink and postgres_fdw should not be embedded directly in SQL examples; the post already calls this out in the security section.
