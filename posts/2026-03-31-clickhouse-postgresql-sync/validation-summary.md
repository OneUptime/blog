# Validation Summary: How to Sync Data from PostgreSQL to ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MaterializedPostgreSQL database engine, PostgreSQL table engine, ReplacingMergeTree, FINAL, OPTIMIZE)
- PostgreSQL (logical replication, wal_level, replication slots, generate_series)
- PeerDB (CDC mirroring with CREATE PEER / CREATE MIRROR SQL interface)
- Python (psycopg2, clickhouse-connect)
- Docker

## Sources Consulted
- ClickHouse documentation on MaterializedPostgreSQL database engine: https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql
- ClickHouse documentation on PostgreSQL table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/postgresql
- ClickHouse documentation on postgresql() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/postgresql
- ClickHouse documentation on ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- PostgreSQL documentation on logical replication: https://www.postgresql.org/docs/current/logical-replication.html
- PeerDB documentation: https://docs.peerdb.io/
- clickhouse-connect Python client documentation: https://clickhouse.com/docs/en/integrations/python
- psycopg2 documentation: https://www.psycopg.org/docs/

## Issues Found
1. **Deduplication ratio query referenced aliases in same SELECT clause (line ~287-290)**: The query used `total_rows - unique_orders AS duplicates` where `total_rows` and `unique_orders` are aliases defined in the same SELECT list. This is not valid in ClickHouse or standard SQL — column aliases cannot be referenced within the same SELECT clause. Fixed by repeating the expressions: `count() - count(DISTINCT order_id) AS duplicates`.

## Review Notes
- The `system.materialized_postgresql_tables` system table referenced in the MaterializedPostgreSQL and Monitoring sections may not exist in all ClickHouse versions. Readers should verify this against their specific ClickHouse version; checking `system.tables` metadata may be needed as a fallback.
- The MaterializedPostgreSQL database engine is marked as experimental in some ClickHouse versions and may require `SET allow_experimental_database_materialized_postgresql = 1` before use.
- The PeerDB section provides a simplified Docker setup. In practice, PeerDB is typically deployed via Docker Compose with multiple services (flow-api, flow-worker, etc.). The SQL syntax is consistent with PeerDB's documented interface but may evolve across versions.
- Using `echo >>` to append PostgreSQL configuration is functional but could create duplicate entries. In production, `ALTER SYSTEM SET wal_level = logical;` would be safer and is the recommended PostgreSQL approach.
- The post correctly uses port 8123 (HTTP) for clickhouse-connect and port 9000 (native) for PeerDB's ClickHouse peer, matching each tool's expected protocol.
