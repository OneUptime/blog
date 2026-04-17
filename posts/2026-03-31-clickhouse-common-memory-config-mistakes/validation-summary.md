# Validation Summary: Common ClickHouse Memory Configuration Mistakes

## Status
validated

## Post Type
Guide / Reference (common-mistakes format)

## Technologies Covered
- ClickHouse server configuration (config.xml, users.xml)
- ClickHouse memory settings (max_server_memory_usage, max_memory_usage, mark_cache_size, uncompressed_cache_size)
- ClickHouse query settings (max_bytes_before_external_group_by)
- ClickHouse background merge pool (background_pool_size, background_merges_mutations_concurrency_ratio)
- ClickHouse system tables (system.events, system.settings)

## Sources Consulted
- ClickHouse Server Settings docs: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse Query Settings docs: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse GROUP BY docs: https://clickhouse.com/docs/sql-reference/statements/select/group-by
- Altinity KB — Memory Configuration Settings: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-memory-configuration-settings/
- Altinity Blog — Caching in ClickHouse: https://altinity.com/blog/caching-in-clickhouse-the-definitive-guide-part-1

## Issues Found
- **Mistake 1 intro inaccuracy**: Original text claimed "By default ClickHouse can use all available server RAM." This is imprecise — ClickHouse defaults to 90% of RAM via `max_server_memory_usage_to_ram_ratio` = 0.9. Updated to state the actual default (90%) while preserving the point that this headroom is too small on shared hosts.

## Review Notes
- All configuration setting names (`max_server_memory_usage`, `max_server_memory_usage_to_ram_ratio`, `max_memory_usage`, `mark_cache_size`, `max_bytes_before_external_group_by`, `background_pool_size`, `background_merges_mutations_concurrency_ratio`, `uncompressed_cache_size`) are valid and correctly spelled.
- `mark_cache_size` default of ~5 GB (5368709120 bytes) is accurate.
- `max_memory_usage` default of 10 GB is accurate.
- `system.events` and `system.settings` columns (`event`/`value` and `name`/`value` respectively) are correct; `MarkCacheHits`, `MarkCacheMisses`, and `MarkCacheEvictions` are all real events.
- The guidance that `max_bytes_before_external_group_by` should be roughly half of `max_memory_usage` matches common ClickHouse tuning advice to leave room for merging spilled aggregation data.
- Note: `uncompressed_cache_size` default has historically been 8 GB / 5 GB depending on version; in recent versions it is non-zero by default, so the advice to set it to 0 for analytics workloads is still relevant and accurate.
- `background_pool_size` is configured at the server level in current ClickHouse versions (matches the post's placement in config.xml).
