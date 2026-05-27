# Validation Summary: How to Perform Zero-Downtime Schema Migrations in Cloud SQL PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- PostgreSQL
- pg_repack
- pgstattuple
- PostgreSQL DDL and indexing
- PostgreSQL streaming replication and read replicas

## Sources Consulted
- Google Cloud SQL for PostgreSQL extensions documentation: https://cloud.google.com/sql/docs/postgres/extensions
- Google Cloud SQL for PostgreSQL replication lag documentation: https://docs.cloud.google.com/sql/docs/postgres/replication/replication-lag
- Google Cloud SQL for PostgreSQL database version policy documentation: https://docs.cloud.google.com/sql/docs/postgres/db-versions
- pg_repack official documentation: https://reorg.github.io/pg_repack/
- PostgreSQL pgstattuple documentation: https://www.postgresql.org/docs/current/pgstattuple.html
- PostgreSQL ALTER TABLE documentation: https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL table modification documentation for fast ADD COLUMN defaults: https://www.postgresql.org/docs/current/ddl-alter.html

## Issues Found
- The post described pg_repack as a way to perform schema changes directly. pg_repack reorganizes tables and indexes online; it does not replace `ALTER TABLE` for changing constraints or column definitions. Updated the description and schema-change section to frame pg_repack as post-migration cleanup and optional table reordering.
- The post said the table-level exclusive lock only happens during the final swap. Official pg_repack docs state that short `ACCESS EXCLUSIVE` locks are needed during initial setup and during final swap/drop. Updated the explanation and diagram note.
- The feature list claimed pg_repack can change table storage parameters. The official pg_repack options support table/index reorganization, ordering, index-only repacks, and tablespace relocation, not arbitrary table storage parameter changes. Replaced that item with index rebuilding/relocation.
- The extension verification query used `pg_available_extensions`, which can show extensions that are available but not installed. Changed it to query `pg_extension`.
- The Debian/Ubuntu install command used `pg-repack`, which is not the versioned package name used by PostgreSQL apt packaging. Changed the example to `postgresql-16-repack`.
- The `pgstattuple` bloat query cast only the table name to `regclass`, which can fail or resolve incorrectly depending on `search_path`. Updated it to schema-qualify identifiers with `format('%I.%I', schemaname, tablename)::regclass`.
- The pg_repack examples used unsupported `--all-tables` and `-v` flags. Replaced `--all-tables` with the documented default behavior for all eligible tables in the selected database, and replaced `-v` with documented `--echo`.
- The primary-key migration example incorrectly implied `pg_repack --order-by` changes the primary key. Replaced it with a PostgreSQL-supported `CREATE UNIQUE INDEX CONCURRENTLY` plus `ALTER TABLE ... PRIMARY KEY USING INDEX` flow, then kept pg_repack as an optional reorder step.
- The backfill section included a shell command in a SQL code block. Split the pg_repack command into a `bash` block.
- The Cloud SQL replica lag command referenced MySQL replica configuration metadata. Replaced it with a PostgreSQL read-replica query using `pg_last_xact_replay_timestamp()`, matching Cloud SQL's documented replica lag calculation.
- The cron example used unsupported `--all-tables`. Updated it to run pg_repack for all eligible tables in the selected database.

## Review Notes
- The article is technically valid after the corrections. Future improvements could add caveats for partitioned tables, `CREATE INDEX CONCURRENTLY` not running inside a transaction block, and pg_repack's requirement that full-table targets have a primary key or a suitable unique `NOT NULL` index.
