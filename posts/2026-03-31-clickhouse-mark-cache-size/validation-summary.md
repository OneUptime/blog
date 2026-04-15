# Validation Summary: How to Configure mark_cache_size in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse server configuration (config.xml / config.d drop-ins)
- ClickHouse system tables (`system.server_settings`, `system.metrics`, `system.events`, `system.parts`, `system.query_log`)

## Sources Consulted
- ClickHouse documentation on mark_cache_size server setting: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#mark_cache_size
- ClickHouse documentation on system.server_settings: https://clickhouse.com/docs/en/operations/system-tables/server_settings
- ClickHouse documentation on system.settings: https://clickhouse.com/docs/en/operations/system-tables/settings
- ClickHouse documentation on system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse documentation on system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse documentation on SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system

## Issues Found

1. **Wrong system table in "Default and Maximum Values" section**: The original query used `system.settings` to look up `mark_cache_size`, but the post itself correctly states this is a server-level setting, not a query-level setting. Server-level settings are stored in `system.server_settings`, not `system.settings`. Changed the table name from `system.settings` to `system.server_settings` to match the correct table (and to be consistent with the later query in the "Checking Current Mark Cache Size and Usage" section which already correctly used `system.server_settings`).

2. **Incorrect ORDER BY in sizing query**: The query in the "Sizing Recommendations" section used `ORDER BY marks_size DESC` where `marks_size` is an alias for `formatReadableSize(sum(marks_bytes))`. This produces human-readable strings like "1.23 GiB" or "456.00 MiB", and sorting these alphabetically does not yield correct numeric ordering (e.g., "9.00 KiB" would sort above "100.00 MiB"). Changed to `ORDER BY sum(marks_bytes) DESC` to sort by the raw numeric byte count.

## Review Notes
- The post mentions `systemctl reload clickhouse-server` and `SYSTEM RELOAD CONFIG` as alternatives to restart. Whether `mark_cache_size` can be changed via config reload without a full restart depends on the ClickHouse version. In older versions, a restart is required. In newer versions (23.x+), some cache settings may be dynamically reloadable. The post's phrasing "Reload or restart" is acceptable but readers on older versions should be aware a full restart may be needed.
- The `.mrk3` file extension referenced is correct for the default adaptive index granularity format used in modern ClickHouse. Older formats used `.mrk` or `.mrk2`.
- The granule math (10M rows / 8192 granule size = ~1220 marks per column) is correct.
- The default value of 5368709120 bytes = 5 GiB is correct (5 * 1024^3).
- All `system.metrics`, `system.events`, and `ProfileEvents` names referenced (`MarkCacheBytes`, `MarkCacheFiles`, `MarkCacheHits`, `MarkCacheMisses`) are correct.
- The `SYSTEM DROP MARK CACHE` syntax is correct.
