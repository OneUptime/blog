# Validation Summary: How to Set Up Automatic Data Retention Policies in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree tables
- TTL expressions
- Partition management
- ClickHouse system tables

## Sources Consulted
- ClickHouse Docs: Manage data with TTL (time-to-live) - https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse Docs: Manipulations with Table TTL - https://clickhouse.com/docs/sql-reference/statements/alter/ttl
- ClickHouse Docs: Dropping partitions - https://clickhouse.com/docs/managing-data/drop_partition
- ClickHouse Docs: system.parts - https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse Docs: system.part_log - https://clickhouse.com/docs/operations/system-tables/part_log

## Issues Found
- Conditional TTL examples used `WHERE` directly after the TTL expression. ClickHouse's documented conditional row-deletion TTL syntax uses `DELETE WHERE`, so the examples were updated to include `DELETE WHERE`.
- The partition cleanup example used `ALTER TABLE ... DROP PARTITION WHERE ...`, which is not valid ClickHouse syntax. ClickHouse `DROP PARTITION` requires a specific partition expression, so the example was changed to drop a concrete partition returned by the generated cleanup script.
- The partition cleanup comments referred to a procedure, but the example is an externally scheduled SQL script. The wording was changed to avoid implying a ClickHouse stored procedure.
- The cleanup script now filters `system.parts` by `database = currentDatabase()` to avoid generating commands from another database with the same table name.
- The monitoring query used `min_date` and `max_date`; for DateTime-based tables, `min_time` and `max_time` are the more appropriate `system.parts` columns, so the query was updated.
- The `system.part_log` query selected non-current columns `result_part_name` and `result_part_path` and described the rows as pending cleanup. It now selects documented columns `part_name`, `path_on_disk`, and `merge_reason`, and filters for recent TTL cleanup merge reasons.

## Review Notes
TTL cleanup is merge-driven rather than immediate. ClickHouse documentation notes that expired rows or columns are processed during merges, with TTL merge settings controlling repeat timing. The article remains correct as a practical guide after the SQL fixes.
