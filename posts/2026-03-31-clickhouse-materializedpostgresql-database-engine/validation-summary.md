# Validation Summary: How to Use MaterializedPostgreSQL Database Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MaterializedPostgreSQL database engine)
- PostgreSQL (logical replication, WAL, publications)
- CDC (Change Data Capture)

## Sources Consulted
- ClickHouse official docs — MaterializedPostgreSQL database engine: https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql
- ClickHouse official docs — MaterializedPostgreSQL table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/materialized-postgresql

## Issues Found

1. **PostgreSQL publication setup was incorrect**: The post instructed users to manually run `CREATE PUBLICATION clickhouse_pub FOR ALL TABLES;`. ClickHouse creates the publication and replication slot automatically. Fixed the PostgreSQL setup section to remove the manual publication creation and instead grant the necessary privileges (`CREATE` on database for publication creation).

2. **PostgreSQL user permissions were incomplete**: The original only granted `SELECT` on tables. The ClickHouse user also needs `CREATE` privilege on the database (for automatic publication creation) and `REPLICATION` role. Added the missing `GRANT CREATE ON DATABASE` statement.

3. **Monitoring section referenced undocumented internal table**: The post queried `pg_replica._materialized_postgresql_tables_list`, which is not documented in official ClickHouse docs and may not exist. Replaced with a query using the `_version` virtual column (which equals the WAL LSN position) to check replication currency, as documented.

4. **Adding tables dynamically used wrong syntax**: The post used `ALTER DATABASE pg_replica MODIFY SETTING materialized_postgresql_tables_list = ...` to add tables. The official documented approach is `ATTACH TABLE pg_replica.new_table;` for adding and `DETACH TABLE ... PERMANENTLY` for removing. Fixed the section accordingly.

5. **Schema change/DDL claims were incorrect**: The post listed ADD COLUMN, DROP TABLE, and CREATE TABLE as "Supported" DDL operations. PostgreSQL logical replication does NOT replicate DDL. Breaking changes (ADD/DROP COLUMN, type changes) cause replication to stop, requiring manual DETACH/ATTACH to re-snapshot. Non-breaking changes (like RENAME COLUMN) allow replication to continue but are not reflected in ClickHouse. Rewrote the section to accurately describe this behavior.

## Review Notes
- The claim that replicated tables use ReplacingMergeTree internally is widely understood in the community but is not explicitly stated in the official ClickHouse documentation. The claim was left as-is since it is commonly accepted.
- The `_sign` and `_version` virtual columns are documented on the table engine page but not the database engine page. The post's usage of `_sign = -1` for deleted rows and `FINAL` for deduplication is correct.
- The CREATE DATABASE syntax, settings (`materialized_postgresql_tables_list`, `materialized_postgresql_schema`), and parameter order (host:port, database, user, password) are all correct per the official docs.
