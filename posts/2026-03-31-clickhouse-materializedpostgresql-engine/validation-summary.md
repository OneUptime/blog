# Validation Summary: How to Use MaterializedPostgreSQL Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MaterializedPostgreSQL table engine)
- PostgreSQL (logical replication protocol)
- CDC (Change Data Capture)

## Sources Consulted
- ClickHouse official docs — MaterializedPostgreSQL table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/materialized-postgresql
- ClickHouse official docs — MaterializedPostgreSQL database engine: https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql
- ClickHouse official docs — PostgreSQL table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/postgresql

## Issues Found

1. **Manual replication slot creation was incorrect**: The post instructed users to manually create a PostgreSQL logical replication slot with `pg_create_logical_replication_slot('clickhouse_slot', 'pgoutput')`. ClickHouse creates and manages its own replication slot automatically. Removed the manual slot creation and added a note that ClickHouse handles this.

2. **CREATE TABLE syntax was missing column definitions and PRIMARY KEY**: The MaterializedPostgreSQL table engine requires explicit column definitions and a PRIMARY KEY clause in the CREATE TABLE statement. The original post omitted both, which would cause an error. Added example column definitions matching the query example and a `PRIMARY KEY order_id` clause.

3. **Missing experimental setting**: The MaterializedPostgreSQL table engine is experimental and requires `SET allow_experimental_materialized_postgresql_table = 1` before use. Added this prerequisite step before the CREATE TABLE example.

4. **Replication monitoring used wrong system table**: The post suggested querying `system.settings WHERE name LIKE '%postgresql%'` to check replication status. `system.settings` shows server configuration parameters, not replication state. Replaced with a query using the `_version` hidden column (which tracks the PostgreSQL WAL LSN position) to assess replica currency.

## Review Notes
- The post does not mention that TOAST values are not replicated (default values are used instead). This is a known limitation documented in the official ClickHouse docs.
- The post does not mention the minimum PostgreSQL version requirement. The official docs indicate PostgreSQL 11+ is required (for `pg_replication_slot_advance`).
- The privilege setup shown (REPLICATION + SELECT) may be incomplete for some PostgreSQL versions. Depending on the version, the user may also need CREATE PUBLICATION privilege and access to certain system tables (`pg_publication`, `pg_replication_slots`, `pg_publication_tables`).
- The feature is noted as not supported on ClickHouse Cloud; ClickPipes is recommended instead.
