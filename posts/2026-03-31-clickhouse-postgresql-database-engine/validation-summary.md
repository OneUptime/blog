# Validation Summary: How to Use PostgreSQL Database Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (PostgreSQL database engine)
- PostgreSQL
- MaterializedPostgreSQL database engine (mentioned as alternative)

## Sources Consulted
- ClickHouse official docs — PostgreSQL database engine: https://clickhouse.com/docs/en/engines/database-engines/postgresql
- ClickHouse official docs — PostgreSQL table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/postgresql
- ClickHouse official docs — MaterializedPostgreSQL database engine: https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql

## Issues Found
1. **INSERT support incorrectly denied.** The post stated "Read-only by default; INSERT is not supported for the database engine." The official ClickHouse documentation explicitly states that the PostgreSQL database engine "Supports read and write operations (SELECT and INSERT queries)." INSERT runs as `COPY ... FROM STDIN` on the PostgreSQL side with auto-commit after each statement. Fixed the limitations section to accurately reflect write support.

## Review Notes
- The post recommends MaterializedPostgreSQL for analytics workloads. This is conceptually sound, but MaterializedPostgreSQL is currently an experimental feature requiring the setting `allow_experimental_database_materialized_postgresql = 1`. ClickHouse Cloud users are directed to use ClickPipes instead. The post does not mention the experimental status, but this is acceptable since it is a brief recommendation rather than a MaterializedPostgreSQL tutorial.
- The `use_table_cache` optional parameter (6th positional argument in CREATE DATABASE) is not mentioned. This is fine for a tutorial-level post.
- Predicate pushdown claims are accurate: simple WHERE clauses (=, !=, >, >=, <, <=, IN) are pushed to PostgreSQL; joins, aggregations, sorting, and complex expressions are executed on the ClickHouse side.
- All SQL syntax is valid ClickHouse SQL.
