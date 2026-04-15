# Validation Summary: How to Use system.tables and system.databases in ClickHouse

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse
- ClickHouse system tables (`system.tables`, `system.databases`)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation — system.tables: https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse official documentation — system.databases: https://clickhouse.com/docs/en/operations/system-tables/databases

## Issues Found

### 1. Non-existent column `data_compressed_bytes` in system.tables
- **What was wrong:** The query in the "system.tables Overview" section used `formatReadableSize(data_compressed_bytes) AS compressed`. The column `data_compressed_bytes` does not exist in `system.tables`.
- **What was changed:** Replaced with `formatReadableSize(total_bytes_uncompressed) AS uncompressed`. The `total_bytes` column (already shown as `total_size`) represents compressed/on-disk size, and `total_bytes_uncompressed` is the correct companion column showing uncompressed data size.
- **Why:** Per the official ClickHouse documentation, the available size columns in `system.tables` are `total_bytes` (compressed on-disk) and `total_bytes_uncompressed`.

### 2. Non-existent column `ttl_field` in system.tables
- **What was wrong:** The query in the "Checking TTL and Partition Expression" section selected `ttl_field`. This column does not exist in `system.tables`.
- **What was changed:** Replaced with `engine_full`, which contains the full engine specification including TTL settings.
- **Why:** Per the official ClickHouse documentation, there is no dedicated TTL column in `system.tables`. The TTL configuration is part of the engine definition, accessible via `engine_full` or `create_table_query`.

## Review Notes
- The `comment IS NULL OR comment = ''` check in the "Finding Tables Without Comments" section is technically redundant since `comment` is a non-nullable `String` column (default is `''`, never NULL). The query still works correctly — the `IS NULL` part simply never matches. This is defensive coding and not a bug, so it was left as-is.
- All `system.databases` columns used in the post (`name`, `engine`, `data_path`, `metadata_path`, `uuid`) were verified as correct.
- The `NULLS LAST` syntax, `formatReadableSize()` function, `count()` without arguments, and `LIKE '%MergeTree%'` pattern are all valid ClickHouse SQL.
- The mention of database engines `Atomic`, `Ordinary`, and `Memory` is accurate. `Ordinary` is noted as legacy, which is correct.
