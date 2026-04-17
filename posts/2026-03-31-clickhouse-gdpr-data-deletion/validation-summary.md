# Validation Summary: How to Implement GDPR Data Deletion in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, ReplicatedMergeTree)
- ClickHouse SQL: lightweight DELETE, ALTER TABLE mutations, TTL expressions, partitions
- ClickHouse system tables: `system.mutations`, `system.parts`
- GDPR right-to-erasure compliance workflow

## Sources Consulted
- ClickHouse official docs - Lightweight DELETE: https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse official docs - ALTER mutations (DELETE/UPDATE): https://clickhouse.com/docs/en/sql-reference/statements/alter/delete
- ClickHouse official docs - TTL for columns and tables: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse official docs - ALTER PARTITION: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse official docs - `system.mutations`: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse official docs - `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official docs - Enum data type: https://clickhouse.com/docs/en/sql-reference/data-types/enum
- ClickHouse official docs - UUID functions (`generateUUIDv4`): https://clickhouse.com/docs/en/sql-reference/functions/uuid-functions
- ClickHouse changelog: lightweight delete introduced 22.8 (experimental, Aug 2022), GA in 23.3 (March 2023)

## Issues Found
No technical issues found. All SQL syntax (lightweight DELETE, ALTER TABLE DELETE/UPDATE mutations, Enum8, TTL, partition drop), system-table column references (`system.mutations`: `mutation_id`, `command`, `create_time`, `is_done`, `parts_to_do`; `system.parts`: `partition`, `table`, `active`), and behavioral claims (column TTL resets String to empty string, OPTIMIZE FINAL forces physical removal, mutations propagate via replication log, no multi-statement transactions) verify against the official ClickHouse documentation.

## Review Notes
- The "Introduced in ClickHouse 22.8" claim for lightweight deletes is correct but worth knowing the nuance: lightweight deletes were experimental in 22.8 and became GA in 23.3 (March 2023). The post acknowledges this with "(required in some versions)" next to the `allow_experimental_lightweight_delete` setting, so no change is needed.
- The multi-table erasure example has a minor workflow gap: the request is INSERTed with `status = 'pending'`, then Step 5 updates rows where `status = 'in_progress'`. The implication is that an application transitions the status to `in_progress` before running deletes, but that step is not shown in SQL. This is an illustrative workflow, not a technical correctness issue, so it was left as written.
- The `gdpr_erasure_requests` table uses `ORDER BY (requested_at, user_id)` — lookups by `user_id` alone won't benefit from the primary index, but this is a design choice for the example and not incorrect.
- TTL on a String column without an explicit default resets to empty string (the type's default), matching the post's claim.
