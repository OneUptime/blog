# Validation Summary: How to Monitor PostgreSQL Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (modern versions, 13+)
- pg_stat_activity (system catalog view)
- pg_stat_statements (extension)
- EXPLAIN ANALYZE / EXPLAIN (ANALYZE, BUFFERS)
- pg_stat_user_indexes / pg_stat_user_tables
- pg_stat_progress_vacuum
- pg_stat_database
- pg_constraint
- pg_cancel_backend / pg_terminate_backend
- PgBouncer (mentioned)

## Sources Consulted
- PostgreSQL official documentation: System Catalogs / Statistics Collector views (https://www.postgresql.org/docs/current/monitoring-stats.html)
- pg_stat_statements documentation (https://www.postgresql.org/docs/current/pgstatstatements.html)
- EXPLAIN syntax documentation (https://www.postgresql.org/docs/current/sql-explain.html)
- pg_constraint catalog documentation (https://www.postgresql.org/docs/current/catalog-pg-constraint.html)
- System administration functions (pg_cancel_backend, pg_terminate_backend) (https://www.postgresql.org/docs/current/functions-admin.html)
- pg_stat_progress_vacuum documentation (https://www.postgresql.org/docs/current/progress-reporting.html)

## Issues Found
No technical issues found. All SQL queries reference valid columns, all function signatures are correct, all configuration directives are accurate, and the `total_exec_time`/`mean_exec_time` column names in `pg_stat_statements` correctly reflect the renaming introduced in PostgreSQL 13 (the previous names `total_time`/`mean_time` would not work on a modern instance).

## Review Notes
- The query labeled "Index hit ratio" actually computes the proportion of scans served by an index vs. sequential scan (idx_scan / (idx_scan + seq_scan)). In some PostgreSQL literature, "index hit ratio" instead refers to the buffer cache hit ratio for index pages (idx_blks_hit / (idx_blks_hit + idx_blks_read)). Both interpretations are commonly used; the query and its 95% rule-of-thumb threshold are reasonable as presented, but readers familiar with the buffer-cache definition might find the naming ambiguous. Not a technical error.
- The "Find unused indexes" query filters out indexes backing primary key (`p`) and unique (`u`) constraints, but does not exclude indexes backing exclusion constraints (`x`). In most workloads this is not significant, and the omission is a minor edge case rather than an error.
- The post's column names in `pg_stat_statements` (`total_exec_time`, `mean_exec_time`) require PostgreSQL 13 or later. This is appropriate for a 2026-era post but worth noting if readers maintain very old installations.
- Replication lag is listed in the alerting thresholds table without a corresponding query in the post. That's a minor omission but not a correctness issue.
