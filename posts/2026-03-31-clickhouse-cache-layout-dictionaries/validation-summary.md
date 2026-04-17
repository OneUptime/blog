# Validation Summary: How to Create Cache Layout Dictionaries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (dictionaries)
- Cache layout dictionaries (`CACHE`, `SSD_CACHE`)
- ClickHouse source (CLICKHOUSE)
- MySQL source for dictionaries
- `dictGetString` function
- `system.dictionaries` system table
- `SYSTEM RELOAD DICTIONARY` statement

## Sources Consulted
- ClickHouse Dictionaries reference: https://clickhouse.com/docs/en/sql-reference/dictionaries
- ClickHouse system.dictionaries: https://clickhouse.com/docs/en/operations/system-tables/dictionaries
- ClickHouse ext-dict-functions (dictGet / dictGetString): https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- ClickHouse SYSTEM statements (RELOAD DICTIONARY): https://clickhouse.com/docs/en/sql-reference/statements/system

## Issues Found

1. **`system.dictionaries` filter used wrong column name.**
   - Original: `WHERE layout = 'cache'`
   - Problem: There is no `layout` column in `system.dictionaries`. The correct column is `type`, and its values are the allocation type name in capitalized form (e.g., `Cache`, `Hashed`, `Flat`).
   - Fix: Changed to `WHERE type = 'Cache'`.

2. **`SSD_CACHE` layout used an undocumented parameter.**
   - Original: `MAX_STORED_KEYS 10000000`
   - Problem: `MAX_STORED_KEYS` is not part of the documented `SSD_CACHE` layout parameters. The official parameters are `BLOCK_SIZE`, `FILE_SIZE`, `READ_BUFFER_SIZE`, `WRITE_BUFFER_SIZE`, and `PATH`.
   - Fix: Replaced `MAX_STORED_KEYS 10000000` with `WRITE_BUFFER_SIZE 1048576`, which is a documented parameter.

## Review Notes
- `SIZE_IN_CELLS`, `BLOCK_SIZE`, `FILE_SIZE`, `READ_BUFFER_SIZE`, `PATH`, the quoted `WHERE` clause inside `SOURCE(CLICKHOUSE(...))`, `SYSTEM RELOAD DICTIONARY`, and `dictGetString(...)` usage are all correct per the current ClickHouse documentation.
- The generic `dictGet(dict, attr, key)` could also be used instead of type-specific `dictGetString`, but the type-specific variants are still supported and idiomatic.
- The claim that `hit_rate < 0.8` warrants increasing `SIZE_IN_CELLS` is a reasonable rule of thumb, not an official threshold — workloads vary, and some users may accept a lower hit rate in exchange for memory savings.
