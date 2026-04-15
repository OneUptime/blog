# Validation Summary: How to Configure uncompressed_cache_size in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration, system tables, cache management)
- SQL (ClickHouse SQL dialect)
- XML configuration (ClickHouse config.xml / config.d drop-ins)

## Sources Consulted
- ClickHouse official documentation on server settings and `uncompressed_cache_size`
- ClickHouse official documentation on `system.server_settings`, `system.metrics`, `system.events`, and `system.query_log` tables
- ClickHouse official documentation on `SYSTEM` commands (`DROP UNCOMPRESSED CACHE`, `RELOAD CONFIG`)
- Cross-referenced with other ClickHouse blog posts in this repository covering the same setting (`clickhouse-how-to-configure-clickhouse-uncompressed-cache`, `clickhouse-system-drop-cache`, `clickhouse-system-reload-config`)

## Issues Found

1. **Incorrect default value**: The post stated the default `uncompressed_cache_size` is `1073741824` (1 GiB) in some versions. The actual ClickHouse default changed from `0` (disabled) to `8589934592` (8 GiB) in newer versions, not 1 GiB. Fixed by changing `1073741824` (1 GiB) to `8589934592` (8 GiB).

2. **Incorrect config reload method**: The post recommended `SYSTEM RELOAD CONFIG;` to apply the `uncompressed_cache_size` change. This server-level cache setting requires a full server restart to take effect; it is not dynamically reloadable via `SYSTEM RELOAD CONFIG`. Fixed by replacing the SQL reload command with `sudo systemctl restart clickhouse-server`.

## Review Notes
- All SQL syntax (queries against `system.server_settings`, `system.metrics`, `system.events`, `system.query_log`) is correct.
- The per-query `use_uncompressed_cache` setting and its usage with `SETTINGS` clause are correct.
- The `SYSTEM DROP UNCOMPRESSED CACHE` command syntax is correct.
- The metric and event names (`UncompressedCacheBytes`, `UncompressedCacheCells`, `UncompressedCacheHits`, `UncompressedCacheMisses`, `UncompressedCacheWeightLost`) are correct.
- The `ProfileEvents` map access syntax in `system.query_log` is correct.
- The sizing recommendations and guidance on when to disable the cache are reasonable and technically sound.
- The explanation of the relationship between the uncompressed cache and the OS page cache is accurate.
