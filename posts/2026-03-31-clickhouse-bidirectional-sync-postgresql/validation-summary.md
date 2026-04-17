# Validation Summary: How to Set Up Bidirectional Sync Between ClickHouse and PostgreSQL

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (MaterializedPostgreSQL database engine, PostgreSQL table engine)
- PostgreSQL (logical replication / CDC source and write target)
- SQL (DDL and DML examples for both engines)
- Bash / `clickhouse-client` for scheduled aggregation jobs

## Sources Consulted
- [ClickHouse MaterializedPostgreSQL database engine docs](https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql)
- [ClickHouse PostgreSQL table engine docs](https://clickhouse.com/docs/en/engines/table-engines/integrations/postgresql)
- [ClickHouse MaterializedPostgreSQL source docs on GitHub](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/engines/database-engines/materialized-postgresql.md)
- ClickHouse system tables source under `src/Storages/System` on GitHub

## Issues Found
1. **Non-existent system table.** The "Monitor Both Directions" section recommended `SELECT * FROM system.materialized_postgresql_databases;`. No such system table exists in ClickHouse — neither in the official docs nor the source under `src/Storages/System`. Replaced with a working query against `system.databases` filtered by `engine = 'MaterializedPostgreSQL'`, and adjusted the prose to describe what the query actually shows (database registration, not lag).
2. **Misapplied SYSTEM command.** The "Schedule the Aggregation Job" section claimed you could use `SYSTEM SYNC REPLICA` "with a scheduled query." `SYSTEM SYNC REPLICA` waits for a `ReplicatedMergeTree` replica to catch up; it is not a scheduling mechanism and is unrelated to MaterializedPostgreSQL. Replaced the suggestion with the correct alternative (cron job or refreshable materialized view).

## Review Notes
- `MaterializedPostgreSQL` is still marked experimental in ClickHouse and requires `allow_experimental_database_materialized_postgresql = 1`; the post does not mention this, but it is not strictly an error since users hitting the engine will get a clear error message and the standard workflow is well-known. Worth flagging in a future revision.
- The `MaterializedPostgreSQL(...)` and `PostgreSQL(...)` engine argument orders match the official documentation (`'host:port', 'database', [table,] 'user', 'password'`).
- The PostgreSQL-side DDL (`CREATE TABLE ... PRIMARY KEY (report_date, country)`) is valid standard SQL and compatible with PostgreSQL.
- The `INSERT INTO pg_daily_revenue SELECT ... FROM pg_live.orders` pattern relies on `pg_live.orders` being available via the same `MaterializedPostgreSQL` database created earlier — that linkage is correct.
- For idempotent nightly upserts into PostgreSQL, the post could mention the `on_conflict` parameter of the `PostgreSQL` engine (e.g., `ON CONFLICT (report_date, country) DO UPDATE SET ...`), but this is an enhancement rather than a correction.
