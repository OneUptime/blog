# Validation Summary: How to Fix 'Slow Database Queries' Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SQL
- PostgreSQL
- MySQL
- Python DB-API-style cursor usage
- Database indexing and query planning

## Sources Consulted
- PostgreSQL Documentation: `log_min_duration_statement` logging configuration - https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL Documentation: `ALTER SYSTEM` and configuration reload behavior - https://www.postgresql.org/docs/current/sql-altersystem.html
- PostgreSQL Documentation: `EXPLAIN` / `EXPLAIN ANALYZE` - https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL Documentation: `CREATE INDEX`, `CONCURRENTLY`, partial indexes, expression indexes, and `INCLUDE` columns - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation: PL/pgSQL transaction management in `DO` / `CALL` - https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL Documentation: multicolumn indexes - https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL Documentation: indexes and `ORDER BY` - https://www.postgresql.org/docs/current/indexes-ordering.html
- PostgreSQL Documentation: `pg_stat_activity` - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL Documentation: `pg_class.reltuples` row-count estimates - https://www.postgresql.org/docs/current/catalog-pg-class.html
- MySQL Reference Manual: The slow query log - https://dev.mysql.com/doc/refman/9.7/en/slow-query-log.html
- MySQL 8.0 Reference Manual: `EXPLAIN` and `EXPLAIN ANALYZE` - https://dev.mysql.com/doc/refman/8.0/en/explain.html

## Issues Found
- The post said full table scans become "exponentially slower" as data grows. Changed this to say the cost generally grows linearly, which better matches the behavior of scanning every row.
- The PostgreSQL EXPLAIN metrics table listed "Low shared hit" as a good buffer signal. Changed it to "High shared hit"; high reads are the warning sign.
- PostgreSQL-specific examples using `json_agg`, `INCLUDE`, and expression-index syntax were presented without a database qualifier. Added PostgreSQL qualifiers to avoid implying the snippets are portable MySQL syntax.
- The PL/pgSQL batch-update block uses `COMMIT` inside a `DO` block. PostgreSQL allows transaction control in top-level `DO` invocations, so I added a comment saying to run the block outside an explicit transaction.
- The composite-index diagram recommended ordering columns by selectivity with the most selective column first. Changed this to the more accurate query-pattern guidance used by the surrounding example: equality predicates first, then range or sort columns.

## Review Notes
- The MySQL `EXPLAIN ANALYZE` example is accurate for MySQL 8.0.18 and later.
- The PostgreSQL `pg_class.reltuples` estimate is technically correct for rough full-table estimates, but it is approximate and depends on statistics refreshed by `VACUUM`, `ANALYZE`, or certain DDL operations.
