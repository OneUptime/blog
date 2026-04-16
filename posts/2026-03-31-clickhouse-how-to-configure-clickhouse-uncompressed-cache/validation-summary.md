# Validation Summary: How to Configure ClickHouse Uncompressed Cache

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse (server configuration, caching subsystem)
- ClickHouse SQL (system tables: `system.server_settings`, `system.events`, `system.metrics`)
- ClickHouse XML server configuration (`config.xml`, `config.d/`)
- systemd (clickhouse-server service)

## Sources Consulted
- ClickHouse source `src/Core/Defines.h` — `DEFAULT_UNCOMPRESSED_CACHE_MAX_SIZE = 0_MiB`, `DEFAULT_UNCOMPRESSED_CACHE_POLICY = "SLRU"`
- ClickHouse source `src/Core/ServerSettings.cpp` — declaration of `uncompressed_cache_size` server setting
- ClickHouse source `src/Core/Settings.cpp` — declaration of `use_uncompressed_cache` session setting (default `false`)
- ClickHouse source `src/Common/ProfileEvents.cpp` — confirms `UncompressedCacheHits`, `UncompressedCacheMisses`, `UncompressedCacheWeightLost`
- ClickHouse source `src/Common/CurrentMetrics.cpp` — confirms `UncompressedCacheBytes` metric
- ClickHouse official docs: operations/server-configuration-parameters/settings, operations/caches

## Issues Found
No technical issues found.

- The `uncompressed_cache_size` default of 0 (disabled) matches the post's claim about being disabled in some versions.
- `use_uncompressed_cache` defaults to 0 (false), consistent with the per-query example.
- All referenced system events and metrics (`UncompressedCacheHits`, `UncompressedCacheMisses`, `UncompressedCacheWeightLost`, `UncompressedCacheBytes`) are valid.
- `SYSTEM DROP UNCOMPRESSED CACHE` syntax is correct.
- XML configuration uses the correct `<clickhouse>` root tag and valid `config.d/` placement.
- The SQL in the hit-rate computation (`sumIf` + `nullIf` to avoid division by zero) is syntactically and semantically correct.

## Review Notes
- ClickHouse source code comments note that "Uncompressed cache does not usually improve the performance and should be mostly avoided" — the post appropriately frames this as a niche optimization for CPU-bound, repeated-access workloads rather than a universal recommendation.
- There is also an automatic behavior (not mentioned in the post, but not incorrect to omit): for queries that read more than ~1 million rows, ClickHouse disables the uncompressed cache automatically to prevent pollution. Future revisions could mention this.
- The `uncompressed_cache_size` setting can now be changed without restart (via `SYSTEM RELOAD CONFIG`) in recent ClickHouse versions, though `systemctl restart` is still a valid approach.
- Sizing recommendations in the table are reasonable guidelines, not prescriptive — actual tuning depends on workload.
