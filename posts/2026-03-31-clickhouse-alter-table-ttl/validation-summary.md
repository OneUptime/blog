# Validation Summary: How to Alter Table TTL in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL DDL (ALTER TABLE)
- TTL (Time-To-Live) for column-level and table-level data lifecycle management
- Storage tiering (TO DISK, TO VOLUME, DELETE actions)
- ClickHouse system tables (`system.tables`, `system.parts`, `system.mutations`)
- Distributed DDL (`ON CLUSTER`)

## Sources Consulted
- ClickHouse ALTER COLUMN documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse ALTER TTL documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse "Manage Data with TTL" guide (referenced from official docs)
- ClickHouse system table reference (`system.parts`, `system.mutations`, `system.tables`)

## Issues Found
1. **Incorrect column TTL removal syntax.** The post claimed that reissuing `ALTER TABLE events MODIFY COLUMN sensitive_data String;` (without a `TTL` clause) would remove an existing column-level TTL. According to ClickHouse documentation, this is not true — `MODIFY COLUMN` without `TTL` does not remove a previously set TTL. The dedicated `REMOVE TTL` clause must be used. Fixed by replacing the example with `ALTER TABLE events MODIFY COLUMN sensitive_data REMOVE TTL;` and updating the surrounding explanation accordingly.

## Review Notes
- All other syntax verified against official ClickHouse documentation: `ALTER TABLE ... MODIFY TTL`, `ALTER TABLE ... REMOVE TTL`, `ALTER TABLE ... MATERIALIZE TTL`, multi-tier TTL with `TO VOLUME`/`TO DISK`/`DELETE` actions, and `ON CLUSTER '{cluster}'` macro usage are all correct.
- `system.parts` columns referenced (`name`, `min_time`, `max_time`, `rows`, `active`, `table`, `database`) and `system.mutations` columns (`mutation_id`, `command`, `is_done`, `parts_to_do`, `table`, `create_time`) are valid.
- Note: column-level TTL cannot be applied to columns used in the partition key or primary key — not mentioned in the post but worth keeping in mind for future updates.
- The verification query using `engine_full` from `system.tables` shows the engine clause including TTL; alternatively `create_table_query` could be used for a fuller view, but the existing query is correct.
