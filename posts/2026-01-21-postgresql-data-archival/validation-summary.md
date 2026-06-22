# Validation Summary: How to Implement Data Archival in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- PostgreSQL declarative partitioning
- PostgreSQL PL/pgSQL
- PostgreSQL TOAST compression
- PostgreSQL tablespaces
- PostgreSQL pg_dump and psql
- pg_cron

## Sources Consulted
- PostgreSQL 18 Documentation: CREATE TABLE - https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 18 Documentation: ALTER TABLE - https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL 18 Documentation: CREATE TABLESPACE - https://www.postgresql.org/docs/current/sql-createtablespace.html
- PostgreSQL 18 Documentation: TOAST - https://www.postgresql.org/docs/current/storage-toast.html
- PostgreSQL 18 Documentation: PL/pgSQL Basic Statements / GET DIAGNOSTICS - https://www.postgresql.org/docs/current/plpgsql-statements.html
- PostgreSQL 18 Documentation: pg_dump - https://www.postgresql.org/docs/current/app-pgdump.html
- pg_cron official repository documentation - https://github.com/citusdata/pg_cron

## Issues Found
- The separate archive table example inserted rows into the archive table and then ran a separate DELETE with the same predicate. I changed it to use `DELETE ... RETURNING` inside a CTE so the rows archived are exactly the rows removed from the active table.
- The partitioning example detached `events_2024_01` without first showing that partition being created. I added the missing January 2024 partition definition so the example is internally consistent.
- The automated archival function used `INTEGER` for the archived row count, while PostgreSQL documents `ROW_COUNT` as `bigint`. I changed the function to return `BIGINT`.
- The automated archival function had the same separate INSERT/DELETE issue as the manual archive example. I changed it to use `DELETE ... RETURNING` and count the inserted rows.
- The compression section referred to `pg_compression` and showed `CREATE TABLESPACE ... WITH (compression = 'lz4')`. Core PostgreSQL does not provide that tablespace compression option; current tablespace options are planner and I/O cost parameters. I replaced this with PostgreSQL's supported per-column TOAST compression syntax and kept the tablespace example as a storage-location move only.

## Review Notes
- `ALTER COLUMN ... SET COMPRESSION lz4` applies to variable-width columns and requires a PostgreSQL build with LZ4 support. Existing table contents are not necessarily rewritten immediately by storage parameter changes; a table rewrite may be needed for changes to affect existing rows.
- The `pg_dump -t orders_archive myapp > orders_archive.sql` and `psql archive_db < orders_archive.sql` commands are valid for a simple SQL-format dump and restore, but production archive workflows may need schema qualification, ownership/privilege handling, and dependency checks.
