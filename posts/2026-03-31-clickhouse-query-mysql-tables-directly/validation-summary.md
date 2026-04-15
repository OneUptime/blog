# Validation Summary: How to Query MySQL Tables Directly from ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- MySQL
- ClickHouse `mysql()` table function
- ClickHouse `MySQL` table engine
- ClickHouse Named Collections
- MaterializedMySQL database engine

## Sources Consulted
- ClickHouse mysql() table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/mysql
- ClickHouse MySQL table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/mysql
- ClickHouse mutations (ALTER TABLE UPDATE/DELETE) documentation: https://clickhouse.com/docs/guides/developer/mutations
- ClickHouse Named Collections documentation: https://clickhouse.com/docs/operations/named-collections
- ClickHouse MaterializedMySQL documentation: https://clickhouse.com/docs/en/engines/database-engines/materialized-mysql

## Issues Found
1. **Incorrect UPDATE syntax on MySQL engine table (Critical)**: The post claimed the MySQL engine supports INSERT, UPDATE, and DELETE, and showed an `ALTER TABLE mysql_customers UPDATE name = 'Jane Smith' WHERE id = 42;` example. This is wrong on two counts:
   - `ALTER TABLE ... UPDATE` is a ClickHouse mutation syntax that only works on MergeTree-family engines. It will produce an error on MySQL engine tables.
   - The MySQL engine only supports SELECT and INSERT operations, not UPDATE or DELETE.
   - **Fix**: Rewrote the section to accurately state that only SELECT and INSERT are supported, removed the incorrect ALTER TABLE UPDATE example, and added a note that UPDATE/DELETE must be executed directly on the MySQL server.

## Review Notes
- The `MaterializedMySQL` engine mentioned in the summary is experimental and requires `SET allow_experimental_database_materialized_mysql = 1` to use. The post doesn't mention this, but it's only a brief reference rather than a recommendation to use it immediately.
- The Connection Pooling example omits column definitions in the CREATE TABLE statement. While this works as an abbreviated illustration, a real CREATE TABLE for the MySQL engine typically requires column definitions.
- Predicate pushdown behavior is correctly described at a high level, though it's worth noting that only simple predicates (=, !=, >, <, etc.) are pushed down; complex expressions and LIMIT are evaluated on the ClickHouse side.
