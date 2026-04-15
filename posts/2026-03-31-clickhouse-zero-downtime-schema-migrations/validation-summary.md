# Validation Summary: How to Handle Zero-Downtime Schema Migrations in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- SQL (ALTER TABLE, mutations, projections, skip indexes)
- ClickHouse distributed tables
- clickhouse-client CLI

## Sources Consulted
- [ClickHouse ALTER TABLE Column Manipulations](https://clickhouse.com/docs/sql-reference/statements/alter/column) — verified RENAME COLUMN version and ADD COLUMN behavior
- [ClickHouse system.mutations table](https://clickhouse.com/docs/operations/system-tables/mutations) — verified column names in monitoring query
- [ClickHouse GitHub PR #9948](https://github.com/ClickHouse/ClickHouse/pull/9948) — confirmed RENAME COLUMN was added in v20.4, not 21.4
- [ClickHouse CHANGELOG v20.4.2.9](https://github.com/ClickHouse/ClickHouse/blob/v20.5.4.40-stable/CHANGELOG.md) — release notes confirming RENAME COLUMN in 20.4
- [Altinity KB: How ALTERs work in ClickHouse](https://kb.altinity.com/altinity-kb-setup-and-maintenance/alters/) — confirmed lazy default evaluation behavior for ADD COLUMN

## Issues Found

### Issue 1: Incorrect version for RENAME COLUMN support
- **What was wrong:** The post stated RENAME COLUMN was added in version "21.4+" (lines 43 and 46).
- **What was changed:** Corrected to "20.4+" in both occurrences.
- **Why:** `ALTER TABLE ... RENAME COLUMN` was introduced in ClickHouse v20.4.2.9 (released 2020-05-12) via PR #9948, not version 21.4.

### Issue 2: Broken backfill WHERE clause in expand-contract pattern
- **What was wrong:** The backfill step used `WHERE user_uuid = '00000000-0000-0000-0000-000000000000'` to identify rows needing backfill, but the column was added with `DEFAULT generateUUIDv4()`. In ClickHouse, when a column is added to a MergeTree table, existing data parts don't physically contain the column — the DEFAULT expression is evaluated lazily on read. Since `generateUUIDv4()` produces random UUIDs on each read, existing rows never have the zero UUID, so the WHERE clause would never match any rows, making the backfill a no-op.
- **What was changed:** Changed `WHERE user_uuid = '00000000-0000-0000-0000-000000000000'` to `WHERE 1` to correctly target all existing rows for backfill.
- **Why:** `WHERE 1` unconditionally matches all rows, ensuring the backfill mutation actually updates existing data. This is the standard pattern when backfilling a newly added column.

## Review Notes
- The "Potentially Blocking Operations" section describes `MODIFY COLUMN` type changes as potentially blocking. Technically, the ALTER command returns immediately and the mutation runs asynchronously in the background, but the characterization is reasonable since the background mutation can impact query performance. No change needed.
- The Distributed Tables section shows manual per-shard ALTER execution. While correct, the more common production approach uses `ON CLUSTER` syntax (e.g., `ALTER TABLE events_local ON CLUSTER my_cluster ADD COLUMN ...`). This is a potential improvement for a future revision but not a technical error.
- Adding indexes and projections via ALTER is metadata-only for new data parts. Existing parts require `MATERIALIZE INDEX` or `MATERIALIZE PROJECTION` to build the index/projection retroactively. The post doesn't mention this, which could be noted in a future update.
