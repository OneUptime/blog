# Validation Summary: How to Optimize JOIN Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, JOINs, dictionaries, distributed queries, system tables)
- SQL

## Sources Consulted
- ClickHouse docs — JOIN clause: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse docs — Dictionaries: https://clickhouse.com/docs/en/sql-reference/dictionaries
- ClickHouse docs — Dictionary layouts: https://clickhouse.com/docs/en/sql-reference/dictionaries/external-dictionaries/external-dicts-dict-layout
- ClickHouse docs — Dictionary sources: https://clickhouse.com/docs/en/sql-reference/dictionaries/external-dictionaries/external-dicts-dict-sources
- ClickHouse source — `src/Dictionaries/ClickHouseDictionarySource.cpp` (for SOURCE(CLICKHOUSE(...)) parameter names)
- ClickHouse source — `src/Core/Settings.cpp` (to confirm `join_algorithm`, `max_bytes_in_join`, `join_overflow_mode`, `grace_hash_join_initial_buckets` exist)
- ClickHouse integration tests — `tests/integration/test_dictionaries_ddl/test.py` (for SOURCE(CLICKHOUSE(...)) DDL syntax)

## Issues Found
- **`DATABASE` keyword in `SOURCE(CLICKHOUSE(...))`**: The post originally used `SOURCE(CLICKHOUSE(TABLE users DATABASE 'analytics'))`. Verified against `ClickHouseDictionarySource.cpp` and ClickHouse integration tests: for DDL-based dictionaries, the accepted parameter is `DB` (the DDL config path only reads `.db`, not `.database`; only the named-collection path accepts both as aliases). Changed both occurrences of `DATABASE` to `DB` in the two `CREATE DICTIONARY` examples so the DDL works as written.

## Review Notes
- The post describes the default join algorithm as "hash". In recent ClickHouse versions, the default `join_algorithm` setting is `direct,parallel_hash,hash` (tried in that order), so in practice `parallel_hash` is often selected first for typical JOINs. The behavioral description in the post (right-hand table loaded into memory) is still accurate for all hash-family algorithms, so no change was made, but readers on very recent versions may observe `parallel_hash` execution by default.
- The "SEMI JOIN" subsection shows an `IN (subquery)` pattern rather than the explicit `SEMI LEFT JOIN` syntax. This is semantically equivalent and a common ClickHouse idiom, but ClickHouse does support explicit `LEFT SEMI JOIN` / `RIGHT SEMI JOIN` syntax as well. Left unchanged since the content is correct as described.
- All join algorithm values (`hash`, `parallel_hash`, `grace_hash`, `full_sorting_merge`) and the `grace_hash_join_initial_buckets` setting were verified against ClickHouse's `Settings.cpp`.
- `max_bytes_in_join`, `join_overflow_mode` (`throw`/`break`), and `system.query_log` columns (`query_id`, `memory_usage`, `query_duration_ms`, `query`, `type`, `event_time`) all confirmed as valid.
- `ANY LEFT JOIN`, `GLOBAL JOIN`, and `GLOBAL IN` syntax all valid.
- Dictionary layouts `HASHED()` and `FLAT()` valid; the ~100K cardinality guidance for `FLAT` is reasonable (FLAT is bounded by `max_array_size`, default 500,000).
