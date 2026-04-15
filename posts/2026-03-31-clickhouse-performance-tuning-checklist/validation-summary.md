# Validation Summary: ClickHouse Performance Tuning Checklist

## Status
validated

## Post Type
Checklist / Reference Guide

## Technologies Covered
- ClickHouse (server configuration, schema design, query optimization)
- ClickHouse system tables (system.query_log, system.columns, system.settings, system.server_settings)
- ClickHouse XML configuration format (config.d, users.d)

## Sources Consulted
- [ClickHouse Server Configuration Parameters](https://clickhouse.com/docs/operations/server-configuration-parameters/settings) — verified `max_server_memory_usage_to_ram_ratio`, `background_merges_mutations_concurrency_ratio`, and `background_pool_size`
- [ClickHouse Settings (session-level)](https://clickhouse.com/docs/operations/settings/settings) — verified `max_memory_usage` is a session/profile-level setting, not a server config element
- [system.query_log](https://clickhouse.com/docs/operations/system-tables/query_log) — verified `normalized_query_hash`, `query_duration_ms`, and `type = 'QueryFinish'`
- [system.columns](https://clickhouse.com/docs/operations/system-tables/columns) — verified `data_compressed_bytes` and `data_uncompressed_bytes`
- [system.server_settings](https://clickhouse.com/docs/operations/system-tables/server_settings) — verified `background_pool_size` belongs here, not in `system.settings`
- [LowCardinality Data Type](https://clickhouse.com/docs/sql-reference/data-types/lowcardinality) — confirmed <10,000 distinct values threshold
- [Data Skipping Indexes](https://clickhouse.com/docs/optimize/skipping-indexes) — verified skip index guidance around value rarity and granule clustering
- [Custom Partitioning Key](https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key) — confirmed `toYYYYMM` and `toYYYYMMDD` usage
- [Altinity KB: Memory Configuration](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-memory-configuration-settings/) — cross-referenced memory setting placement

## Issues Found

### 1. `max_memory_usage` incorrectly placed in server config XML
**What was wrong:** The `max_memory_usage` setting was placed as a top-level element under `<clickhouse>` in a `config.d/*.xml` file. This is a session/profile-level setting that belongs in `users.xml` or `users.d/*.xml` inside a `<profiles>` section. Placing it in the server config would cause ClickHouse to refuse to start.
**What was changed:** Split the memory configuration into two separate XML blocks — the server-level `max_server_memory_usage_to_ram_ratio` in `config.d/memory.xml`, and the per-query `max_memory_usage` in `users.d/memory.xml` inside `<profiles><default>`.

### 2. `background_pool_size` queried from wrong system table
**What was wrong:** The SQL example queried `system.settings` for `background_pool_size`, but this is a server-level configuration parameter that lives in `system.server_settings`, not the session-level `system.settings` table.
**What was changed:** Split the query into two: session-level settings (`max_threads`, `max_insert_threads`) from `system.settings`, and `background_pool_size` from `system.server_settings`.

### 3. Misleading "high-selectivity filters" guidance for skip indexes
**What was wrong:** The checklist item said "Adding skip indexes for high-selectivity filters on non-primary-key columns." The term "high-selectivity" is ambiguous and the key factor for skip index effectiveness is that matching values are rare and physically clustered in few granules (correlated with sort order), not just that the filter is selective.
**What was changed:** Reworded to "Adding skip indexes for filters on non-primary-key columns where matching values are rare and clustered in few granules."

## Review Notes
- All SQL queries use correct ClickHouse SQL syntax (`uniqExact`, `formatReadableSize`, `count()`, `any()`, `UNION ALL`).
- The `normalized_query_hash`, `query_duration_ms`, and `type = 'QueryFinish'` references in the query_log query are all verified correct.
- The compression ratio query against `system.columns` is correct and functional.
- The LowCardinality threshold of 10,000 distinct values matches official documentation exactly.
- `toYYYYMM` and `toYYYYMMDD` are correct ClickHouse partition expression functions.
- `background_merges_mutations_concurrency_ratio` is a valid server setting (default: 2).
