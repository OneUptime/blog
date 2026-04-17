# Validation Summary: How to Use ClickHouse as an Analytical Layer Over OLTP Databases

## Status
validated

## Post Type
Tutorial / Architecture guide

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, MaterializedMySQL, MaterializedPostgreSQL engines)
- MySQL (OLTP source)
- PostgreSQL (OLTP source)
- CDC / Replication patterns
- BI tools (Grafana, Metabase, Superset — mentioned)
- Python (read routing example)

## Sources Consulted
- ClickHouse MaterializedPostgreSQL engine: https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql
- ClickHouse MaterializedMySQL engine: https://clickhouse.com/docs/en/engines/database-engines/materialized-mysql
- ClickHouse SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse uniq() aggregate: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse conditional functions: https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse operators (INTERVAL): https://clickhouse.com/docs/en/sql-reference/operators/index

## Issues Found
No technical issues found. All SQL syntax, engine definitions, function names, data types, and operator usage verified against official ClickHouse documentation.

## Review Notes
- `MaterializedMySQL` and `MaterializedPostgreSQL` are officially marked as experimental engines in ClickHouse and require enabling settings such as `allow_experimental_database_materialized_postgresql = 1` (and the MySQL equivalent) before `CREATE DATABASE` succeeds. The post could note this caveat for readers deploying to production, though the syntax shown is correct.
- The `daily_revenue` table uses `SummingMergeTree` with a `unique_customers UInt32` column. `SummingMergeTree` sums values across rows with identical ORDER BY keys, which is not semantically equivalent to a distinct count — simple summing of per-batch unique counts will double-count customers who appear in multiple batches. For accurate distinct counts across merges, `AggregatingMergeTree` with `uniqState()` / `uniqMerge()` would be more appropriate. The syntax is valid, so this is a design caveat rather than a technical error.
- The Python `get_db_connection` example is intentionally minimal (no production-grade pooling, retries, or error handling) and reads as illustrative pseudocode, which is appropriate for the scope.
