# Validation Summary: How to Use system.parts in ClickHouse for Part Analysis

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family)
- system.parts system table
- OPTIMIZE TABLE SQL statement
- ClickHouse tiered storage (disk_name)
- ClickHouse merge mechanics and part lifecycle

## Sources Consulted
- ClickHouse official documentation: system.parts table (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse official documentation: MergeTree settings including parts_to_throw_insert (https://clickhouse.com/docs/en/operations/settings/merge-tree-settings)
- ClickHouse official documentation: OPTIMIZE statement (https://clickhouse.com/docs/en/sql-reference/statements/optimize)

## Issues Found

1. **`parts_to_throw_insert` default value was outdated (line 66)**: The post stated the default is 300, but ClickHouse changed this default to 3000 in version 23.6. Updated from 300 to 3000.

2. **`min_time` / `max_time` column descriptions were inaccurate (lines 28-29)**: The post described these as "Minimum/Maximum value of the first DateTime ORDER BY column." These columns actually represent the minimum/maximum value of the date/time key specified in the partition expression, not the ORDER BY key. Updated the descriptions accordingly.

## Review Notes
- All SQL queries are syntactically correct and use valid ClickHouse functions (`formatReadableSize`, `currentDatabase()`, `count()`, `round()`).
- All column names and types in the Key Columns table are accurate per official documentation.
- The part name anatomy diagram correctly describes the `partition_id_min_block_max_block_level` format.
- The `old_parts_lifetime` default of 480 seconds is correct.
- The OPTIMIZE TABLE syntax examples are valid.
- The Mermaid diagram renders correctly for the part name anatomy.
- The post correctly references companion system tables (`system.merges`, `system.part_log`) in the summary.
