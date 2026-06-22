# Validation Summary: How to Create Indexes Concurrently in PostgreSQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- PostgreSQL indexes
- CREATE INDEX CONCURRENTLY
- REINDEX CONCURRENTLY
- PostgreSQL progress and lock monitoring views

## Sources Consulted
- PostgreSQL 18 documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL 18 documentation: REINDEX - https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL 18 documentation: Progress Reporting - https://www.postgresql.org/docs/current/progress-reporting.html
- PostgreSQL 18 documentation: Explicit Locking - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL 18 documentation: pg_locks - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL 12 release notes - https://www.postgresql.org/docs/release/12.0/

## Issues Found
- The post said standard index creation uses an ACCESS EXCLUSIVE lock. PostgreSQL documents that CREATE INDEX without CONCURRENTLY takes a SHARE lock on the table, blocking writes but allowing reads. Updated the lock description accordingly.
- The concurrent index creation flow was oversimplified as merging changes. PostgreSQL documents waits for writers, two scans, validation, and waiting for old snapshots before marking the index valid. Updated the step list to match that behavior more closely.
- The progress query selected `relname` directly from `pg_stat_progress_create_index`, but the view exposes `relid`, not `relname`. Updated the query to use `relid::regclass AS relname`.
- The REINDEX comment said "without locking", which was too broad. PostgreSQL still takes locks, but REINDEX CONCURRENTLY avoids locks that prevent normal reads and writes. Updated the wording.
- The conclusion said to always use CONCURRENTLY for production index operations. PostgreSQL notes concurrent builds have more overhead and take longer, so this was narrowed to production cases where blocking writes is not acceptable.

## Review Notes
The examples are syntactically valid for supported PostgreSQL versions. `pg_stat_progress_create_index` and `REINDEX ... CONCURRENTLY` are PostgreSQL 12+ features, which matches the post's version notes. `CREATE INDEX CONCURRENTLY`, `DROP INDEX CONCURRENTLY`, and `REINDEX CONCURRENTLY` should be run outside explicit transaction blocks.
