# Validation Summary: How to Use Distributed Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Distributed table engine)
- ClickHouse cluster configuration (XML)
- MergeTree storage engine
- ClickHouse SQL (DDL/DML, JOINs, GLOBAL IN)
- ClickHouse system tables (`system.distribution_queue`)
- Sharding strategies (`rand()`, `cityHash64()`)

## Sources Consulted
- ClickHouse Distributed engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- `system.distribution_queue` reference: https://clickhouse.com/docs/en/operations/system-tables/distribution_queue
- ClickHouse configuration files: https://clickhouse.com/docs/en/operations/configuration-files
- ClickHouse `IN` operators (incl. `GLOBAL IN`): https://clickhouse.com/docs/en/sql-reference/operators/in
- MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **Wrong column names in `system.distribution_queue` query** — The post selected `bytes_on_disk` and `rows_on_disk`, neither of which exist on this system table. Replaced with the actual columns: `data_files`, `data_compressed_bytes`, `error_count`, and `last_exception` per the official system-tables reference. The accompanying comment was tightened from "pending rows" to "pending data files" to match the actual semantics (the queue tracks unsent `.bin` files, not row counts).
2. **Legacy `<yandex>` config root element** — Modern ClickHouse documentation specifies `<clickhouse>` as the top-level XML element for server configuration files. `<yandex>` is the legacy form retained for backward compatibility but is no longer documented. Replaced with `<clickhouse>` to match current best practice.

## Review Notes
- The `_shard_num` virtual column is still valid; ClickHouse also offers the `shardNum()` function (notably useful in `remote()`/`cluster()` table functions). Either is acceptable.
- The local table example uses `MergeTree`, while the cluster definition includes replicas. In a real replicated setup users would typically pair this with `ReplicatedMergeTree` (or `Replicated` database engine / `ON CLUSTER` DDL). This isn't strictly an error for the example, but readers running production replicated clusters should be aware.
- The `Distributed(...)` syntax shown matches the documented form `Distributed(cluster, database, table[, sharding_key[, policy_name]])`. Hash-based sharding keys (`cityHash64(user_id)`) are an explicitly recommended idiom.
- The `GLOBAL IN` description matches official semantics: subquery executes on the initiator, results are materialized into a temp table and shipped to each shard.
