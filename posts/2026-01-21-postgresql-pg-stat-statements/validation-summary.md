# Validation Summary: How to Monitor PostgreSQL with pg_stat_statements

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pg_stat_statements
- PostgreSQL configuration
- SQL query performance monitoring
- Prometheus-style metrics views

## Sources Consulted
- PostgreSQL 18 pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL 13 pg_stat_statements documentation: https://www.postgresql.org/docs/13/pgstatstatements.html
- PostgreSQL 12 pg_stat_statements documentation: https://www.postgresql.org/docs/12/pgstatstatements.html
- PostgreSQL 14 pg_stat_statements documentation: https://www.postgresql.org/docs/14/pgstatstatements.html
- PostgreSQL CREATE EXTENSION documentation: https://www.postgresql.org/docs/current/sql-createextension.html

## Issues Found
- The prerequisites said PostgreSQL 9.4+, but the examples use PostgreSQL 13+ column names such as `total_exec_time`, `mean_exec_time`, and `stddev_exec_time`. Updated the prerequisite to PostgreSQL 13+ and noted that older versions use `total_time`, `mean_time`, and related columns.
- Current PostgreSQL documentation notes that PostgreSQL 14+ needs query identifier calculation enabled for pg_stat_statements to be active. Added a commented `compute_query_id = auto` note so PostgreSQL 14+ users see the requirement without breaking PostgreSQL 13 configuration.
- The "Query Throughput Analysis" query used two-argument `round()` directly on double precision expressions, which is invalid in PostgreSQL. Cast the expressions to `numeric`.
- The same query described wall-clock throughput, but it actually calculated calls per cumulative execution minute. Renamed the section and aliases to match what the query measures.
- The reset-specific-user heading said PostgreSQL 14+, but the documented `pg_stat_statements_reset(userid, dbid, queryid)` signature is present in PostgreSQL 13. Updated the heading to PostgreSQL 13+.
- The snapshot comparison joined only on `queryid`. Updated it to also join on `dbid` and `userid`, matching PostgreSQL's documented guidance that `queryid` is more reliable when paired with database and user identifiers.

## Review Notes
PostgreSQL 13 is no longer a supported PostgreSQL release as of this review date, but the article's examples are accurate for PostgreSQL 13+ column names. For future updates, consider targeting only currently supported PostgreSQL versions and noting that `pg_stat_statements.track_planning` can add measurable overhead on highly concurrent workloads.
