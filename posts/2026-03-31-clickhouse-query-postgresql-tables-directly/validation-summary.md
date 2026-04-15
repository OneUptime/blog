# Validation Summary: How to Query PostgreSQL Tables Directly from ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (postgresql table function, PostgreSQL table engine, MaterializedPostgreSQL database engine)
- PostgreSQL (as remote data source)
- ClickHouse Named Collections
- Federated query / predicate push-down

## Sources Consulted
- ClickHouse official docs — postgresql table function: https://clickhouse.com/docs/sql-reference/table-functions/postgresql
- ClickHouse official docs — PostgreSQL table engine: https://clickhouse.com/docs/engines/table-engines/integrations/postgresql
- ClickHouse official docs — MaterializedPostgreSQL database engine: https://clickhouse.com/docs/engines/database-engines/materialized-postgresql
- ClickHouse official docs — Named collections: https://clickhouse.com/docs/operations/named-collections
- GitHub issue #49972 — Schema inference not supported for PostgreSQL engine: https://github.com/ClickHouse/ClickHouse/issues/49972

## Issues Found
1. **Missing column definitions in "Query a PostgreSQL View" section (line 64)**: The `CREATE TABLE pg_revenue_summary` statement had no column definitions. ClickHouse's PostgreSQL engine does not support automatic schema inference — columns must be explicitly defined. Added example column definitions (`region String`, `total_revenue Decimal(18, 2)`, `order_count UInt64`).

2. **Missing column definitions in "Configure Schema" section (line 112)**: The `CREATE TABLE pg_analytics_events` statement also omitted column definitions. Added example columns (`event_id UInt64`, `user_id UInt32`, `event_type String`, `event_time DateTime`) to make the example syntactically valid.

## Review Notes
- The `postgresql` table function signature, parameter order (`host:port`, `database`, `table`, `user`, `password`), and the 6th schema parameter are all correct per official docs.
- INSERT support into PostgreSQL engine tables is correctly described — ClickHouse runs these as `COPY ... FROM STDIN` inside a PostgreSQL transaction.
- The predicate push-down guidance is accurate: simple operators (`=`, `!=`, `>`, `>=`, `<`, `<=`, `IN`) are pushed down to PostgreSQL. Complex expressions like `extract(year FROM ...)` may not be.
- Named collections syntax is correct.
- `MaterializedPostgreSQL` is referenced as a replication alternative, which is appropriate. Note that it is a **database engine** (not a table engine) and is still marked as experimental, requiring `allow_experimental_database_materialized_postgresql=1`. The blog's brief mention is acceptable but readers should be aware of its experimental status.
- The claim "Each query opens a new PostgreSQL connection by default" is accurate. ClickHouse does support connection pooling via settings like `postgresql_connection_pool_size`, but the default behavior is as described.
