# Validation Summary: How to Configure ClickHouse Mark Cache for Better Performance

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse server configuration (config.xml / config.d/)
- ClickHouse system tables (system.parts, system.events, system.tables)
- MergeTree mark files (.mrk and .mrk2)
- ClickHouse caching subsystem (mark cache, uncompressed cache, primary index)

## Sources Consulted
- ClickHouse official documentation — system.parts table: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse official documentation — server configuration parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse official documentation — MergeTree settings: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse official documentation — SYSTEM statements: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse official documentation — sparse primary indexes guide: https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes
- ClickHouse source code — ProfileEvents.cpp for MarkCacheHits/MarkCacheMisses event names

## Issues Found
No technical issues found.

## Review Notes
- The claim that the primary index is "loaded into RAM at table attach time" is a common and reasonable description, though official docs confirm it resides entirely in RAM without specifying the exact loading timing. This is not an error.
- All byte-to-GiB conversions are arithmetically correct (e.g., 5,368,709,120 = 5 × 1024³ = 5 GiB).
- SQL queries use valid ClickHouse syntax including ClickHouse-specific features like referencing column aliases within the same SELECT clause.
- The `marks_bytes` column name in `system.parts` is correct for modern ClickHouse versions (21.x+).
- The sizing guidelines table recommends "2 GiB (default is fine)" for under 1 GiB of marks, which is accurate since the default of 5 GiB more than covers that case.
