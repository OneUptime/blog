# Validation Summary: How to Use PostgreSQL Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (PostgreSQL table engine, postgresql() table function, MergeTree engine)
- PostgreSQL (as remote data source)
- SQL (CREATE TABLE, SELECT, INSERT, JOIN, federated queries)

## Sources Consulted
- ClickHouse official documentation: PostgreSQL Table Engine — https://clickhouse.com/docs/en/engines/table-engines/integrations/postgresql
- ClickHouse official documentation: postgresql() Table Function — https://clickhouse.com/docs/en/sql-reference/table-functions/postgresql
- ClickHouse official documentation: PostgreSQL Database Engine (type mapping) — https://clickhouse.com/docs/en/engines/database-engines/postgresql
- ClickHouse source code: `src/Storages/PostgreSQL/fetchPostgreSQLTableStructure.cpp` (ground truth for type mapping)

## Issues Found

1. **Incorrect LIMIT pushdown claim (intro paragraph)**: The post claimed ClickHouse pushes both WHERE and LIMIT clauses to PostgreSQL. Per the official docs, only simple WHERE predicates (`=`, `!=`, `>`, `>=`, `<`, `<=`, `IN`) are pushed down. LIMIT, ORDER BY, joins, and aggregations are all executed on the ClickHouse side. Fixed the intro paragraph and the explanation after the basic query example.

2. **Incorrect type mapping: DATE -> Date**: The source code maps PostgreSQL DATE to ClickHouse `Date32` (wider range: 1900-01-01 to 2299-12-31), not `Date`. Fixed in the type mapping table.

3. **Incorrect type mapping: TIMESTAMP -> DateTime**: The source code maps PostgreSQL TIMESTAMP to `DateTime64(6)` (microsecond precision), not `DateTime`. Fixed in the type mapping table.

4. **Incorrect type mapping: TIMESTAMPTZ -> DateTime (UTC)**: The source code maps TIMESTAMPTZ to `DateTime64(6)`, same as TIMESTAMP, not `DateTime (UTC)`. Fixed in the type mapping table.

5. **Incorrect type mapping: ARRAY -> String (serialized)**: PostgreSQL arrays are automatically mapped to ClickHouse `Array(T)` types, NOT String. This was a significant error. Fixed in the type mapping table and the "Handling PostgreSQL Arrays and JSONB" section, including updating the example column definition from `String` to `Array(String)`.

6. **Incorrect connection pooling SETTINGS syntax**: The post showed `connection_pool_size`, `connect_timeout`, and `read_write_timeout` as engine-level SETTINGS in a CREATE TABLE statement. These settings do not exist as engine parameters. PostgreSQL connection pool settings are server-level settings (`postgresql_connection_pool_size`, `postgresql_connection_pool_wait_timeout`, etc.) configured via SET or server config. Rewrote the section with correct syntax.

7. **Misleading UPDATE suggestion**: The post suggested using the `postgresql()` table function for mutations. Neither the engine nor the table function supports UPDATE or DELETE — only SELECT and INSERT. Fixed to state that mutations must be performed directly on the PostgreSQL server.

8. **Missing types in mapping table**: Added SERIAL (UInt32), BIGSERIAL (UInt64), and alternate type names (REAL, DOUBLE) to the type mapping table for completeness.

## Review Notes
- The post only supports PostgreSQL versions 12 and above per the official docs. This version requirement is not mentioned in the post but could be a useful addition.
- The `on_conflict` parameter (7th argument to the engine) for handling INSERT conflicts (e.g., `ON CONFLICT DO NOTHING`) is not mentioned. This could be useful for the "Writing Back to PostgreSQL" section.
- Named collections (available since ClickHouse 21.11) are the recommended way to store connection credentials in production, avoiding plaintext passwords in DDL. This is not mentioned in the post.
- The federated JOIN example will pull the entire `pg_customers` table into ClickHouse memory for the join. For large remote tables, this could be a performance concern worth noting.
