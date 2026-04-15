# Validation Summary: How to Use system.disks and system.storage_policies in ClickHouse

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse
- system.disks system table
- system.storage_policies system table
- system.parts system table
- system.tables system table
- ClickHouse tiered storage (hot/warm/cold)
- ALTER TABLE MOVE PARTITION/PART syntax
- formatReadableSize() function

## Sources Consulted
- ClickHouse system.disks documentation (https://clickhouse.com/docs/operations/system-tables/disks)
- ClickHouse system.storage_policies documentation (https://clickhouse.com/docs/operations/system-tables/storage_policies)
- ClickHouse system.parts documentation (https://clickhouse.com/docs/operations/system-tables/parts)
- ClickHouse system.tables documentation (https://clickhouse.com/docs/operations/system-tables/tables)
- ClickHouse ALTER TABLE MOVE PARTITION/PART documentation (https://clickhouse.com/docs/sql-reference/statements/alter/partition)
- ClickHouse formatReadableSize function documentation (https://clickhouse.com/docs/sql-reference/functions/other-functions)
- ClickHouse prefer_column_name_to_alias setting documentation

## Issues Found
1. **Alias shadowing in first query (system.disks)**: The original query used `formatReadableSize(free_space) AS free_space` and `formatReadableSize(total_space) AS total_space`, which shadows the original numeric column names with string aliases. Later in the same SELECT, the expression `round((1 - free_space / total_space) * 100, 1)` would reference the aliased string values (e.g., "1.23 GiB") instead of the original numeric columns, because ClickHouse's default `prefer_column_name_to_alias = 0` setting prefers aliases over column names. This would cause a type error at runtime. **Fix:** Renamed the aliases from `free_space`/`total_space` to `free`/`total` to avoid shadowing the original column names.

## Review Notes
- The second query ("Checking Disk Usage Trends") does not have the same alias-shadowing issue because it uses distinct alias names (`used`, `available`) that don't conflict with the original column names.
- All other SQL syntax, column names, and function usage are correct and current.
- The ALTER TABLE MOVE PARTITION/PART syntax is accurate per official documentation.
- The `system.disks` table has additional columns (unreserved_space, is_encrypted, is_read_only, is_remote, cache_path, etc.) not mentioned in the post, but omitting them is fine for a focused guide.
- The `system.storage_policies` table also has additional columns (volume_type, prefer_not_to_merge, perform_ttl_move_on_insert, load_balancing) not covered, which is acceptable for the scope of this post.
