# Validation Summary: How to Use ReplacingMergeTree in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ReplacingMergeTree engine
- SQL (ClickHouse dialect)
- Change Data Capture (CDC) patterns

## Sources Consulted
- ClickHouse official documentation: ReplacingMergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse official documentation: SELECT FINAL modifier — https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- ClickHouse official documentation: INSERT INTO — https://clickhouse.com/docs/en/sql-reference/statements/insert-into
- ClickHouse official documentation: argMax function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse 23.2 release notes (native is_deleted support for ReplacingMergeTree)

## Issues Found

1. **Incomplete engine syntax**: The engine syntax was shown as `ReplacingMergeTree([version_column])`, omitting the `is_deleted` parameter available since ClickHouse 23.2. Updated to `ReplacingMergeTree([ver [, is_deleted]])` and added a bullet point explaining the `is_deleted` behavior.

2. **Result table missing `updated_at` column**: The `SELECT *` query result displayed only 5 columns (user_id, username, email, plan, version) but the table has 6 columns including `updated_at`. Added the missing `updated_at` column with the correct value `2026-03-01 00:00:00` from the winning row.

3. **Incorrect claim about native deletion support**: The post stated "ReplacingMergeTree does not natively delete rows" which is incorrect since ClickHouse 23.2. Updated the section to explain native `is_deleted` support and changed the `products` table engine from `ReplacingMergeTree(version)` to `ReplacingMergeTree(version, is_deleted)` to use the native parameter.

## Review Notes
- The CDC example includes a `sign` column (Int8) with the comment "1 for inserts/updates, -1 for logical deletes". The `sign` column is typically associated with CollapsingMergeTree, not ReplacingMergeTree. While having this column is not technically incorrect (it's just an unused regular column), it could confuse readers. The query correctly filters on `is_active` instead of `sign`. A future revision could remove the `sign` column to avoid confusion.
- The `OPTIMIZE TABLE ... FINAL` warning ("never do this in production at scale") is good advice. In very large tables, this operation can be extremely resource-intensive and block other operations.
- The `argMax` deduplication pattern shown as an alternative to FINAL is a well-known and valid optimization technique in the ClickHouse community.
- The `FINAL` modifier performance has improved significantly in recent ClickHouse versions with optimizations like `do_not_merge_across_partitions_select_final`, so the performance gap between FINAL and the argMax approach may be smaller than implied for some workloads.
