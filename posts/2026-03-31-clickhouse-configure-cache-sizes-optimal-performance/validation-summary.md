# Validation Summary: How to Configure ClickHouse Cache Sizes for Optimal Performance

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse (mark cache, uncompressed cache, query result cache, compiled expression cache)
- XML server configuration (`config.xml`)
- SQL session settings
- Linux page cache (`free`, `vmstat`)

## Sources Consulted
- [ClickHouse Query Cache documentation](https://clickhouse.com/docs/en/operations/query-cache)
- [ClickHouse Server Configuration Parameters](https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings)
- [ClickHouse system.query_cache system table](https://clickhouse.com/docs/operations/system-tables/query_cache)
- [Altinity "Caching in ClickHouse - The Definitive Guide Part 1"](https://altinity.com/blog/caching-in-clickhouse-the-definitive-guide-part-1)
- [ClickHouse PR #53657 – Expose more settings from caches](https://github.com/ClickHouse/ClickHouse/pull/53657)

## Issues Found
1. **Incorrect column `last_hit_time` in `system.query_cache`.** The inspection query referenced `last_hit_time`, but that column does not exist in `system.query_cache`. The actual columns are `query`, `query_id`, `result_size`, `tag`, `stale`, `shared`, `compressed`, `expires_at`, and `key_hash`. Replaced the query with valid columns (`query, result_size, expires_at, stale`) ordered by `expires_at DESC`.
2. **Misleading comment on `query_cache_max_size_in_bytes`.** The comment described the value as "100MB per entry", but `query_cache_max_size_in_bytes` is a user-level cumulative cap, not a per-entry limit. The per-entry limit is the server setting `max_entry_size_in_bytes`. Updated the comment to clarify that it is a "100MB user-level cumulative cap".

## Review Notes
- The `<mark_cache_size>`, `<uncompressed_cache_size>`, and `<compiled_expression_cache_size>` tag names in `config.xml` are correct and still current.
- The `<query_cache>` block structure with `max_size_in_bytes`, `max_entries`, `max_entry_size_in_bytes`, and `max_entry_size_in_rows` matches the documented format and default values.
- `use_uncompressed_cache`, `use_query_cache`, and `query_cache_ttl` are all valid session-level settings.
- ClickHouse caps both `mark_cache_size` and `uncompressed_cache_size` by the `cache_size_to_ram_max_ratio` server setting (default 0.5 of available RAM); the post does not mention this but its recommended values remain within that envelope.
- The `system.asynchronous_metrics` LIKE filter on `%MarkCache%` is valid (metrics like `MarkCacheBytes` and `MarkCacheFiles` are exposed).
