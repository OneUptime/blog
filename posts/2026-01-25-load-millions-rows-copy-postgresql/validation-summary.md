# Validation Summary: How to Load Millions of Rows with COPY in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL COPY
- PostgreSQL psql
- PostgreSQL WAL and checkpoint settings
- PostgreSQL indexes, triggers, unlogged tables, and partitioned tables
- PostgreSQL pg_stat_progress_copy
- pg_bulkload
- Bash

## Sources Consulted
- PostgreSQL 18 COPY documentation: https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL 18 ALTER TABLE documentation: https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL 18 Populating a Database documentation: https://www.postgresql.org/docs/current/populate.html
- PostgreSQL 18 Write Ahead Log configuration documentation: https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL 18 Progress Reporting documentation: https://www.postgresql.org/docs/current/progress-reporting.html
- PostgreSQL 18 psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL 18 CREATE TABLE documentation for unlogged tables: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 17 release notes for COPY ON_ERROR: https://www.postgresql.org/docs/release/17.0/
- PostgreSQL 14 release announcement for COPY progress reporting: https://www.postgresql.org/about/news/postgresql-14-released-2318/
- pg_bulkload project documentation: https://ossc-db.github.io/pg_bulkload/index.html

## Issues Found
- The WAL tuning example used `SET checkpoint_timeout` and `SET max_wal_size`, but PostgreSQL documents those parameters as configuration/server-command-line settings rather than session-settable values. Changed the example to use `ALTER SYSTEM` plus `pg_reload_conf()`, and clarified that `synchronous_commit = off` avoids waiting for WAL flush instead of reducing WAL level.
- The split-file example split a CSV including the header while loading chunks without `HEADER true`, which would make the first chunk fail or import the header as data. Changed the command to remove the header before splitting.
- The trigger-disabling section did not mention that `DISABLE TRIGGER ALL` can require superuser privileges when internally generated constraint triggers are included. Added a caveat and pointed readers to `DISABLE TRIGGER USER` for user-defined triggers only.
- The PostgreSQL 17+ error handling example used invalid syntax `ON_ERROR log` and described logging to an error table. PostgreSQL supports `ON_ERROR stop` and `ON_ERROR ignore`; changed the example to `ON_ERROR ignore` with `LOG_VERBOSITY verbose` and clarified that rejected rows are skipped, not written to a table.
- The `pg_stat_progress_copy` query selected `relname` directly from the progress view, but that column is not present. Changed the example to join `pg_stat_progress_copy` to `pg_class`.
- The complete script saved index definitions in a temporary table in one `psql` session, then attempted to read that temporary table from a later `psql` session where it would not exist. Changed the script to save index definitions to a temporary file and replay that file when recreating indexes.
- The complete script generated unqualified `DROP INDEX` statements. Changed it to generate schema-qualified `DROP INDEX` commands with `format('%I.%I', ...)`.

## Review Notes
The remaining examples are version-sensitive in expected ways: `pg_stat_progress_copy` requires PostgreSQL 14 or later, and `COPY ... ON_ERROR ignore` requires PostgreSQL 17 or later. Server-side `COPY FROM 'filename'` paths must be accessible from the PostgreSQL server process; client-side imports should use `COPY FROM STDIN` or psql `\copy`.
