# Validation Summary: How to Optimize Database Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL query logging, pg_stat_statements, EXPLAIN, indexing, ANALYZE, VACUUM, REINDEX, prepared statements
- MySQL slow query log, Performance Schema, EXPLAIN ANALYZE, optimizer behavior
- SQL query optimization patterns including joins, subqueries, pagination, batching, and indexing
- Python database access patterns with psycopg2-style parameter binding

## Sources Consulted
- PostgreSQL 18 Documentation: ALTER SYSTEM - https://www.postgresql.org/docs/current/sql-altersystem.html
- PostgreSQL 18 Documentation: Error Reporting and Logging - https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL 18 Documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL 18 Documentation: EXPLAIN - https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL 18 Documentation: Using EXPLAIN - https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL 18 Documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL 18 Documentation: Subquery Expressions - https://www.postgresql.org/docs/current/functions-subquery.html
- PostgreSQL 18 Documentation: ANALYZE - https://www.postgresql.org/docs/current/sql-analyze.html
- PostgreSQL 18 Documentation: VACUUM - https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL 18 Documentation: REINDEX - https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL 18 Documentation: PREPARE - https://www.postgresql.org/docs/current/sql-prepare.html
- MySQL 8.0 Reference Manual: The Slow Query Log - https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables - https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement - https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format - https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations - https://dev.mysql.com/doc/refman/8.0/en/semijoins.html
- Psycopg 2.9 Documentation: Basic module usage - https://www.psycopg.org/docs/usage.html

## Issues Found

1. **PostgreSQL ALTER SYSTEM example did not reload configuration.** `ALTER SYSTEM SET` writes configuration, but the setting becomes effective only after a configuration reload or restart for reloadable parameters. Added `SELECT pg_reload_conf();` after setting `log_min_duration_statement`.

2. **pg_stat_statements setup omitted the preload requirement.** `CREATE EXTENSION` is not sufficient unless `pg_stat_statements` has already been added to `shared_preload_libraries` and the server restarted. Added a comment noting that prerequisite.

3. **Composite index column-order guidance was too broad.** "Most selective first" is not a reliable standalone rule for multicolumn indexes; query shape matters, especially equality predicates before range and sort columns. Updated the comment to reflect that.

4. **IN versus EXISTS guidance was too absolute.** The post said `IN` executes the subquery fully and `EXISTS` is faster. PostgreSQL warns not to assume complete subquery evaluation, and MySQL 8.0 can apply semijoin transformations to both `IN` and equivalent `EXISTS` predicates. Changed the section to "Consider EXISTS" and softened the comments to describe query-shape-dependent behavior.

5. **PostgreSQL relation size query passed text to relation-size functions.** The `pg_total_relation_size`, `pg_relation_size`, and `pg_indexes_size` calls should receive a relation identifier. Replaced string concatenation with `format('%I.%I', schemaname, tablename)::regclass` so schema and table names are quoted safely and resolved as relations.

## Review Notes
- The examples are intentionally generic and assume representative `users`, `orders`, and `products` schemas. Readers still need to validate each recommendation with `EXPLAIN` on their own data distribution.
- The Python batch query example uses PostgreSQL-specific `ANY(%s)` array semantics even though the broader article also discusses MySQL.
- `EXPLAIN ANALYZE` executes the statement being explained; the examples use `SELECT`, so there are no write side effects in this post.
