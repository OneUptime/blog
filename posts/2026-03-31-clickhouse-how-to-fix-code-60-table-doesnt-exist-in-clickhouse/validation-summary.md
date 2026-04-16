# Validation Summary: How to Fix 'Code: 60 Table doesn't exist' in ClickHouse

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- ClickHouse (SQL, system tables, replication)
- ClickHouse Keeper / ZooKeeper
- clickhouse-client CLI
- Bash scripting (health checks)
- ReplicatedMergeTree / Distributed table engines

## Sources Consulted
- [ClickHouse system.replicas docs](https://clickhouse.com/docs/en/operations/system-tables/replicas)
- [ClickHouse system.detached_parts docs](https://clickhouse.com/docs/en/operations/system-tables/detached_parts)
- [ClickHouse system.detached_tables docs](https://clickhouse.com/docs/operations/system-tables/detached_tables)
- [ClickHouse system.tables docs](https://clickhouse.com/docs/en/operations/system-tables/tables)
- [ClickHouse system.query_log docs](https://clickhouse.com/docs/en/operations/system-tables/query_log)
- [ClickHouse error codes (ErrorCodes.cpp)](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp) — confirms code 60 = UNKNOWN_TABLE
- [ClickHouse ATTACH/DETACH TABLE docs](https://clickhouse.com/docs/en/sql-reference/statements/attach)

## Issues Found

1. **Incorrect columns in `system.replicas` query (Replicated Table Not Attached section).**
   The original query selected `host_name` and `host_port` from `system.replicas`, but those columns do not exist in that table. They belong to `system.clusters`. Replaced with `database` and `table`, which are valid `system.replicas` columns and appropriate for the use case (identifying which replica a replicated table lives on alongside `replica_name`, `is_leader`, `is_readonly`).

2. **`system.detached_parts` used to find detached tables (Step 2).**
   `system.detached_parts` contains information about detached data parts of MergeTree tables, not about detached tables. A detached part does not cause a `Code: 60 UNKNOWN_TABLE` error. The correct system table for detached tables is `system.detached_tables` (available in modern ClickHouse versions), which exposes `database`, `table`, `metadata_path`, and `is_permanently`. Updated the query and column list, and updated the Summary paragraph that also referenced `system.detached_parts`.

## Review Notes
- Error code 60 (`UNKNOWN_TABLE`) is correct and matches ClickHouse's `ErrorCodes.cpp`.
- `ATTACH TABLE`, `SHOW DATABASES`, `SHOW TABLES FROM <db>`, `ILIKE`, `today()`, `now() - INTERVAL 7 DAY`, and `CREATE TABLE ... AS <other_table> ENGINE = ...` syntax are all valid ClickHouse SQL.
- `system.query_log`'s `query_kind` does include values like `'Drop'` and `'Rename'` — the audit query is correct.
- `system.detached_tables` was introduced in relatively recent ClickHouse versions (24.x). On very old versions (pre-24), operators would need to inspect the `metadata/` / `detached/` directories on disk instead; this caveat is worth noting but is not a correctness issue for current readers.
- The `is_leader` column in `system.replicas` still exists but is largely informational in recent versions since ClickHouse dropped the leader-based replication model — kept as-is since it remains useful for visibility.
