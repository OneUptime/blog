# Validation Summary: How to Query External Data with Foreign Data Wrappers in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL Foreign Data Wrappers
- postgres_fdw
- file_fdw
- mysql_fdw
- PostgreSQL materialized views
- pg_cron
- pgsql-http
- Multicorn
- SQL and PL/pgSQL

## Sources Consulted
- PostgreSQL documentation: postgres_fdw - https://www.postgresql.org/docs/current/postgres-fdw.html
- PostgreSQL documentation: file_fdw - https://www.postgresql.org/docs/current/file-fdw.html
- PostgreSQL documentation: REFRESH MATERIALIZED VIEW - https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
- PostgreSQL documentation: pg_user_mappings - https://www.postgresql.org/docs/current/view-pg-user-mappings.html
- PostgreSQL documentation: CREATE USER MAPPING - https://www.postgresql.org/docs/current/sql-createusermapping.html
- PostgreSQL 10 release notes for aggregate pushdown - https://www.postgresql.org/docs/release/10.0/
- EnterpriseDB mysql_fdw documentation - https://github.com/EnterpriseDB/mysql_fdw
- pgsql-http documentation - https://github.com/pramsey/pgsql-http and https://pgxn.org/dist/http/
- Multicorn documentation - https://multicorn.org/

## Issues Found
- The postgres_fdw pushdown description was too broad about joins. Updated it to clarify that join pushdown applies to compatible foreign tables on the same foreign server.
- The postgres_fdw `extensions` option comment implied it generally enables more remote operations. Updated the comment to state that it allows immutable functions/operators from the listed extension, such as `pg_trgm`, to be considered shippable.
- The materialized view example used `REFRESH MATERIALIZED VIEW CONCURRENTLY` after creating only non-unique indexes. PostgreSQL requires at least one qualifying unique index for concurrent refresh. Added a unique index on `id`.
- The REST API section described `http` as if it were an FDW. Updated the heading and description to distinguish the `http` extension from custom FDWs built with Multicorn.
- The `http_get` example concatenated a query parameter without URL encoding. Updated it to use `urlencode(city)`.
- The security guidance recommended `.pgpass` too broadly. Updated it to note that `postgres_fdw` password-file/service-file approaches are appropriate only for trusted mappings where `password_required 'false'` is suitable.

## Review Notes
The examples are generally accurate for current PostgreSQL versions. Some extensions such as `mysql_fdw`, `pgsql-http`, `pg_cron`, and Multicorn are not bundled with core PostgreSQL, so installation details vary by operating system, package repository, PostgreSQL major version, and managed database provider.
