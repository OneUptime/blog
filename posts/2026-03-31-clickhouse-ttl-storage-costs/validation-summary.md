# Validation Summary: How to Use TTL Policies to Manage ClickHouse Storage Costs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse TTL (time-to-live) policies
- ClickHouse tiered storage (local disks, S3)
- ClickHouse system tables (system.tables, system.parts)
- SummingMergeTree engine
- Materialized views

## Sources Consulted
- ClickHouse MergeTree TTL documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse system.parts documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse system.tables documentation: https://clickhouse.com/docs/operations/system-tables/tables
- ClickHouse ALTER COLUMN documentation: https://clickhouse.com/docs/sql-reference/statements/alter/column
- ClickHouse ALTER TTL documentation: https://clickhouse.com/docs/sql-reference/statements/alter/ttl
- ClickHouse TTL guide: https://clickhouse.com/docs/guides/developer/ttl

## Issues Found

### 1. Invalid `TO TABLE` TTL clause (Aggregating Old Data section)
**What was wrong:** The post used `ALTER TABLE events MODIFY TTL created_at + INTERVAL 7 DAY TO TABLE events_hourly;` — `TO TABLE` is not a valid ClickHouse TTL action. The supported TTL actions are `DELETE`, `TO DISK`, `TO VOLUME`, `RECOMPRESS`, and `GROUP BY ... SET ...`.

**What was changed:** Replaced with the correct idiomatic ClickHouse pattern: a materialized view that continuously aggregates data into a SummingMergeTree summary table, combined with a TTL DELETE rule on the source table to remove old detailed data after 7 days.

**Why:** The `TO TABLE` syntax does not exist in ClickHouse and would produce a syntax error. The materialized view + TTL DELETE approach achieves the same goal (keeping aggregated summaries while deleting old detailed data) using supported features.

### 2. Non-existent columns in `system.tables` query (Viewing Current TTL Settings section)
**What was wrong:** The query referenced `ttl_info.columns` and `ttl_info.table` columns in `system.tables`, which do not exist. The `system.tables` table has no TTL-specific columns.

**What was changed:** Replaced with a query that selects `name` and `create_table_query` from `system.tables`, which contains the full table definition including TTL rules. Also added the simpler `SHOW CREATE TABLE events;` alternative.

**Why:** The original query would fail with an "Unknown identifier" error since those columns do not exist in the `system.tables` schema.

### 3. Incorrect column names in `system.parts` query (Checking TTL Execution section)
**What was wrong:** The query used `min_ttl_delete` and `max_ttl_delete` as column names in `system.parts`.

**What was changed:** Replaced with the correct column names: `delete_ttl_info_min` and `delete_ttl_info_max`.

**Why:** The actual column names in `system.parts` for TTL delete timing are `delete_ttl_info_min` (DateTime) and `delete_ttl_info_max` (DateTime). The original names would cause a query error.

## Review Notes
- The basic row deletion TTL, column-level TTL, tiered storage configuration (local and S3), and `OPTIMIZE TABLE FINAL` usage are all correct.
- The S3 disk XML snippet is shown in isolation (not nested inside `<disks>` / `<storage_configuration>`) for brevity, which is reasonable but readers should understand it needs to be placed within the full storage configuration structure.
- The `OPTIMIZE TABLE events FINAL` command works for forcing TTL application but is a heavy operation on large tables. ClickHouse also offers `ALTER TABLE events MATERIALIZE TTL` as a more targeted alternative, though the post's suggestion is not incorrect.
