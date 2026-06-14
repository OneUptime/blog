# Validation Summary: How to Use COPY Command for Bulk Import in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL COPY and psql \copy
- PostgreSQL CSV, text, and binary COPY formats
- PostgreSQL staging tables, triggers, indexes, UNLOGGED tables, and ON CONFLICT
- PostgreSQL bulk-load settings and progress monitoring
- Python psycopg2 COPY helpers
- Bash and psql automation

## Sources Consulted
- PostgreSQL official COPY documentation: https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL official psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL official ALTER TABLE documentation: https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL official predefined roles documentation: https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL official CREATE TABLE documentation for UNLOGGED tables: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL official progress reporting documentation for pg_stat_progress_copy: https://www.postgresql.org/docs/current/progress-reporting.html
- PostgreSQL official asynchronous commit documentation: https://www.postgresql.org/docs/current/wal-async-commit.html
- Psycopg 2 official cursor documentation: https://www.psycopg.org/docs/cursor.html
- Psycopg 2 official COPY usage documentation: https://www.psycopg.org/docs/usage.html#using-copy-to-and-copy-from

## Issues Found
- The introduction said COPY works by "bypassing the SQL parser and writing directly to the table." Updated this to explain that COPY avoids parsing and planning one INSERT statement per row by streaming data.
- The COPY vs \copy permissions table said server-side COPY requires superuser access. Updated it to include PostgreSQL's `pg_read_server_files` and `pg_write_server_files` predefined roles.
- The ON_ERROR example said it skipped "rows with errors." Updated the comment to specify data type conversion errors, which is the scope documented for `ON_ERROR 'ignore'`.
- The staging-table validation query identified invalid `created_at` values but the INSERT of valid rows did not include the same `created_at` predicate. Added the predicate so the example does not cast known-invalid dates.
- The trigger examples used `DISABLE TRIGGER ALL`, which can require superuser privileges when internal constraint triggers are present. Updated examples to `DISABLE TRIGGER USER` / `ENABLE TRIGGER USER` for the intended user-defined trigger optimization.
- The UNLOGGED table comment said "no WAL overhead." Adjusted it to the more precise statement that data changes are not WAL-logged.
- The psycopg2 file import used `copy_from(..., sep=',')` for no-header CSV files, which uses PostgreSQL text COPY format rather than CSV format. Updated it to use `copy_expert(... WITH CSV)` for both header and no-header imports, and used Python's CSV reader for the header row.
- The shell script did not set `ON_ERROR_STOP`, so psql could continue after an error. Added `-v ON_ERROR_STOP=1`.
- The shell script disabled all triggers. Updated it to disable and re-enable user-defined triggers only.

## Review Notes
The examples still assume trusted table and column names in the Python and shell snippets. For production tooling, identifiers should be validated or safely quoted, and shell variables interpolated into SQL should not come from untrusted input.
