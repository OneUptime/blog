# Validation Summary: How to Optimize Slow Queries in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- pg_stat_statements
- pg_stat_activity
- PostgreSQL indexes, including expression, partial, covering, GIN, and trigram indexes
- PostgreSQL full-text search
- EXPLAIN ANALYZE
- PostgreSQL runtime configuration and statistics

## Sources Consulted
- PostgreSQL documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation: Error Reporting and Logging - https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL documentation: Using EXPLAIN - https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: Index-Only Scans and Covering Indexes - https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL documentation: pg_trgm - https://www.postgresql.org/docs/current/pgtrgm.html
- PostgreSQL documentation: Tables and Indexes for full-text search - https://www.postgresql.org/docs/current/textsearch-tables.html
- PostgreSQL documentation: WITH Queries / Common Table Expressions - https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL documentation: Resource Consumption / work_mem - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL documentation: ANALYZE - https://www.postgresql.org/docs/current/sql-analyze.html

## Issues Found
- The currently running slow query example used `state != 'idle'`, which can include sessions that are not actively running a query, such as idle-in-transaction sessions. Changed it to `state = 'active'` to match the heading and PostgreSQL activity-state semantics.
- The function-on-indexed-column example said `LOWER(email)` cannot use an index on `email`. Clarified that it cannot use a plain index on `email`, since PostgreSQL can use an expression index such as `LOWER(email)`.
- The `pg_trgm` examples used `CREATE EXTENSION pg_trgm;`, which fails if the extension already exists. Changed both examples to `CREATE EXTENSION IF NOT EXISTS pg_trgm;`.
- The `NOT IN` anti-pattern did not call out PostgreSQL's NULL-sensitive `NOT IN` semantics. Added a short SQL comment noting that the example is problematic when the subquery can return NULL.
- The approximate count query filtered `pg_class` only by `relname`, which can be ambiguous across schemas. Changed it to use `'public.orders'::regclass`.
- The JOIN indexing example suggested creating an additional index on `customers(id)` even though a primary key normally already provides one. Replaced that command with a comment to avoid encouraging duplicate indexes.
- The CTE materialization note said PostgreSQL 12+ CTEs are not materialized by default. Corrected it to the documented behavior: single-use, side-effect-free CTEs can be folded into the parent query, while other cases may still be materialized.
- The batch operations block contained PL/pgSQL-like pseudocode and an ellipsis inside a SQL array. Replaced it with syntactically valid SQL examples.

## Review Notes
The post is technically sound after the fixes. Some optimization recommendations remain workload-dependent, especially replacing `OR` with `UNION`, adding covering indexes, and increasing `work_mem`; these are valid techniques but should still be verified with `EXPLAIN (ANALYZE, BUFFERS)` and production-like data.
