# Validation Summary: How to Handle Database Query Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- MySQL
- SQL query optimization
- Database indexing
- Python DB-API style query execution
- PostgreSQL triggers
- PostgreSQL pg_stat_statements

## Sources Consulted
- PostgreSQL documentation: EXPLAIN - https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation: Trigger Functions - https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL documentation: pg_trgm - https://www.postgresql.org/docs/current/pgtrgm.html
- PostgreSQL documentation: Character Types - https://www.postgresql.org/docs/current/datatype-character.html
- PostgreSQL documentation: Enumerated Types - https://www.postgresql.org/docs/current/datatype-enum.html
- MySQL documentation: The Slow Query Log - https://dev.mysql.com/doc/refman/9.7/en/slow-query-log.html
- MySQL documentation: EXPLAIN Statement - https://dev.mysql.com/doc/refman/9.7/en/explain.html
- MySQL documentation: EXPLAIN Output Format - https://dev.mysql.com/doc/refman/9.7/en/explain-output.html
- MySQL documentation: Semijoin and Antijoin Transformations - https://dev.mysql.com/doc/refman/9.7/en/semijoins-antijoins.html

## Issues Found
- The MySQL EXPLAIN example used `EXPLAIN FORMAT=JSON` but described traditional tabular columns such as `type`, `key`, `rows`, and `Extra`. Changed the command to `EXPLAIN FORMAT=TRADITIONAL` so the described columns match the output.
- The PostgreSQL trigger function used `NEW.order_id` for both `INSERT` and `DELETE`. `NEW` is null for row-level `DELETE` triggers, so the function now handles `DELETE` with `OLD.order_id` and returns `OLD`.
- The batch update example used `WHERE id IN %s` with a tuple parameter, which is not portable across DB-API drivers. Changed it to generate one placeholder per id and extend the parameter list.
- The query rewriting section claimed an `IN` subquery is executed for each row. Modern optimizers can transform suitable `IN` and `EXISTS` subqueries into semijoins, so the wording now says the subquery can be harder to reason about or tune and advises comparing plans.
- The execution plan diagram treated high row estimates as the issue and suggested adding a `WHERE` clause. Changed this to bad row estimates and a statistics-focused action.
- The data type section claimed `VARCHAR(255)` wastes space and is slower for fixed-length codes, which is not generally true for PostgreSQL character types. Reworded the example to focus on enforcing valid code length.
- The PostgreSQL enum example said enum values are stored as integers internally. PostgreSQL documents enum values as compact values with catalog-backed internal representation, so the comment now avoids the inaccurate integer claim.
- The pg_stat_statements snippet only mentioned the extension. PostgreSQL also requires loading `pg_stat_statements` through `shared_preload_libraries`, so the prerequisite comment now includes both.
- The index selection guide implied a default B-tree index is always enough for `LIKE 'prefix%'`. Added a PostgreSQL caveat that `text_pattern_ops` may be needed.

## Review Notes
The examples are intentionally generic and still require readers to adapt index choices to data distribution, collation, database version, and measured execution plans.
