# Validation Summary: How to Avoid Using SELECT * in Production MySQL Queries

## Status
validated

## Post Type
Guide / Best Practice

## Technologies Covered
- MySQL (InnoDB, covering indexes, EXPLAIN, query optimization)
- Python (mysql-connector / cursor usage)
- sqlfluff (SQL linting tool)

## Sources Consulted
- MySQL 8.0 Reference Manual: Query Cache removal (https://dev.mysql.com/doc/refman/8.0/en/query-cache.html)
- MySQL 8.0 Reference Manual: SELECT syntax and query hints (https://dev.mysql.com/doc/refman/8.0/en/select.html)
- MySQL 8.0 Reference Manual: EXPLAIN output format, "Using index" extra info (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: Covering indexes and InnoDB clustered index (https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html)
- sqlfluff documentation: Rule reference and naming conventions (https://docs.sqlfluff.com/en/stable/rules.html)

## Issues Found
1. **SQL_NO_CACHE removed in MySQL 8.0+**: The "Network Overhead at Scale" section used `SELECT SQL_NO_CACHE ...` in both example queries. The MySQL query cache was completely removed in MySQL 8.0, and the `SQL_NO_CACHE` hint is deprecated as of MySQL 8.0.3 (it can produce syntax errors or deprecation warnings). Since the post targets production usage and MySQL 8.0+ is the current mainline, removed `SQL_NO_CACHE` from both queries. The examples work correctly without it.

## Review Notes
- The sqlfluff section references rule `L044` with `force_enable = True`. In sqlfluff 1.x, L044 ("Query produces an unknown number of result columns") catches SELECT * in subqueries and CTEs, but is not a blanket "no SELECT * anywhere" rule. In sqlfluff 2.0+, rule names were reorganized (L-prefixed names are deprecated in favor of descriptive names like `AM04`). Readers using the latest sqlfluff should consult the current rule documentation for the appropriate rule name and configuration syntax.
- The "10x more data" claim (5 columns of interest out of 50) is a reasonable approximation but depends on column data types and sizes. It is presented appropriately as an estimate.
- The covering index example is well constructed. The index `(status, created_at, id, total)` correctly covers the query `SELECT id, total, created_at FROM orders WHERE status = 'pending'`, and the EXPLAIN output would indeed show "Using index" in the Extra column.
- The note about COUNT(*) not fetching all columns is accurate and addresses a common misconception effectively.
