# Validation Summary: How to Use Foreign Data Wrappers in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL Foreign Data Wrappers
- postgres_fdw
- file_fdw
- mysql_fdw
- SQL/MED
- PostgreSQL SQL commands: CREATE EXTENSION, CREATE SERVER, CREATE USER MAPPING, CREATE FOREIGN TABLE, IMPORT FOREIGN SCHEMA, EXPLAIN, ANALYZE
- Debian/Ubuntu package installation

## Sources Consulted
- PostgreSQL 18 postgres_fdw documentation: https://www.postgresql.org/docs/current/postgres-fdw.html
- PostgreSQL 18 file_fdw documentation: https://www.postgresql.org/docs/current/file-fdw.html
- PostgreSQL 18 IMPORT FOREIGN SCHEMA documentation: https://www.postgresql.org/docs/current/sql-importforeignschema.html
- PostgreSQL 18 CREATE USER MAPPING documentation: https://www.postgresql.org/docs/current/sql-createusermapping.html
- PostgreSQL 18 libpq service file documentation: https://www.postgresql.org/docs/current/libpq-pgservice.html
- PostgreSQL 18 monitoring statistics documentation: https://www.postgresql.org/docs/current/monitoring-stats.html
- EnterpriseDB mysql_fdw documentation / README: https://github.com/EnterpriseDB/mysql_fdw
- Debian package details for postgresql-18-mysql-fdw: https://packages.debian.org/sid/postgresql-18-mysql-fdw

## Issues Found
- The pushdown section implied that `fetch_size` and `use_remote_estimate` were pushdown options. Updated the heading/comment so it correctly describes checking pushdown and configuring planning/fetch behavior; `use_remote_estimate` obtains remote cost estimates.
- The `file_fdw` description omitted that file access is read-only. Added that qualifier based on the PostgreSQL `file_fdw` documentation.
- The access log example used a normal `.log` file with space delimiters while declaring `format 'csv'`, which would not reliably parse typical Nginx access logs into the listed typed columns. Changed it to a CSV-formatted access log file with `header 'true'` and comma delimiter.
- The MySQL FDW package command was pinned to PostgreSQL 14. Updated it to PostgreSQL 18 and added a note to replace the major version to match the installed server. Also changed the source install step to use `sudo make ... install`.
- The cross-database reporting example referenced `region_a_server.sales` and `region_b_server.sales`, but PostgreSQL queries local foreign table names rather than foreign-server-qualified table paths. Replaced those with local foreign table names.
- The security comment suggested using `.pgpass` instead of user mappings. Updated it to recommend libpq service files for shared connection details while keeping per-user credentials in user mappings.
- The monitoring query referenced nonexistent columns (`foreign_table_name`, `total_calls`, `total_rows`, `total_time`) on `pg_stat_user_tables`. Replaced it with the documented `postgres_fdw_get_connections(true)` function and adjusted the section title.

## Review Notes
The examples are intentionally illustrative and assume prerequisite schemas, roles, files, remote tables, and extension packages exist. The MySQL FDW package name is distribution-specific; source installation remains the portable fallback shown in the post.
