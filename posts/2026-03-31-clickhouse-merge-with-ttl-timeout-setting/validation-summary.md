# Validation Summary: How to Use merge_with_ttl_timeout Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse TTL (Time-To-Live) expressions
- ClickHouse MergeTree settings (`merge_with_ttl_timeout`, `ttl_only_drop_parts`)
- ClickHouse system tables (`system.merge_tree_settings`, `system.tables`, `system.merges`)
- SQL (DDL, ALTER TABLE, system queries)

## Sources Consulted
- ClickHouse MergeTree table engine documentation — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse MergeTree settings reference — https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse system.merges table documentation — https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse system.merge_tree_settings table documentation — https://clickhouse.com/docs/operations/system-tables/merge_tree_settings
- ClickHouse TTL data lifecycle guide — https://clickhouse.com/docs/guides/developer/ttl

## Issues Found

1. **Invalid TTL clause `TO TABLE`**: The post listed `TO TABLE` as a valid TTL move action. ClickHouse TTL supports `TO DISK` and `TO VOLUME` for moving data, but not `TO TABLE`. Changed to `TO VOLUME`.

2. **"partitions" should be "parts" (two occurrences)**: The `ttl_only_drop_parts` setting operates at the **part** level, not the partition level. When enabled, ClickHouse drops entire data parts where all rows have expired — not entire partitions. Fixed both the introductory sentence ("drop entire partitions" → "drop entire parts") and the explanatory note ("only a partition whose ALL rows are expired" → "only a part whose ALL rows are expired").

3. **Misleading SQL comment**: The comment on the `system.tables` query said "View tables with TTL defined and last TTL merge time" but the query does not select any TTL merge time column. Fixed to "View tables with TTL defined".

## Review Notes
- The default value of 14400 seconds for `merge_with_ttl_timeout` is confirmed correct.
- All SQL syntax (CREATE TABLE, ALTER TABLE MODIFY SETTING, ALTER TABLE MATERIALIZE TTL) is valid ClickHouse SQL.
- The `system.merges` query uses column `partition` which is a valid column in that table (distinct from `partition_id`).
- The recommended values table provides reasonable guidance for different use cases.
- The post could mention that ClickHouse docs recommend not setting `merge_with_ttl_timeout` below 300 seconds to avoid excessive I/O, but this is supplementary information rather than an error.
