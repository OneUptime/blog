# Validation Summary: How to Add Columns to a ClickHouse Table

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- SQL DDL (`ALTER TABLE ADD COLUMN`, `MATERIALIZE COLUMN`, `DESCRIBE TABLE`)
- ClickHouse data types: `String`, `LowCardinality(String)`, `UInt32`, `UInt16`, `UInt64`, `UUID`, `Date`, `DateTime`
- ClickHouse cluster/replication macros (`ON CLUSTER`, `'{cluster}'`)
- ClickHouse system tables (`system.columns`)

## Sources Consulted
- Official ClickHouse docs — ALTER COLUMN statements: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse docs — default expressions (DEFAULT, MATERIALIZED, ALIAS): https://clickhouse.com/docs/en/sql-reference/statements/create/table#default_values
- ClickHouse docs — `system.columns`: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse docs — Distributed DDL / ON CLUSTER: https://clickhouse.com/docs/en/sql-reference/distributed-ddl

## Issues Found
No technical issues found.

Verified specifically:
- `ADD COLUMN [IF NOT EXISTS] name [type] [default_expr] [codec] [AFTER name_after | FIRST]` syntax matches docs.
- Multiple comma-separated `ADD COLUMN` actions in a single `ALTER TABLE` are supported.
- `MATERIALIZE COLUMN col` is the correct statement to backfill existing parts for a materialized/defaulted column.
- `ALIAS` columns are computed on read and not stored; `MATERIALIZED` columns cannot be written by `INSERT`. Both statements are accurate.
- The claim that `ADD COLUMN` is a metadata-only operation for MergeTree tables is correct — existing parts are not rewritten until merged or explicitly materialized.
- `ON CLUSTER '{cluster}'` with the `{cluster}` macro (resolved from `config.xml`) is valid ClickHouse usage.
- `system.columns` schema (`database`, `table`, `name`) used in the idempotency check query is correct.

## Review Notes
- The statement "Without `ON CLUSTER` you would need to run the statement on every node manually" is a reasonable simplification. For `ReplicatedMergeTree` tables, `ALTER` is automatically replicated via ZooKeeper/Keeper to all replicas of the shard, so you would only need to run it once per shard (not per node); `ON CLUSTER` extends this across shards. The post's phrasing is acceptable in a beginner-focused context but could be nuanced in a future revision.
- For columns with an explicit `DEFAULT` expression added via `ALTER TABLE ADD COLUMN`, existing parts return the default on read until a merge or a subsequent `MATERIALIZE COLUMN` call rewrites them — the post's description is accurate.
- Minor stylistic note (not an error): the `MATERIALIZE COLUMN` operation supports `IN PARTITION` scoping, which is not mentioned here but is out of scope for an introductory post.
