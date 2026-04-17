# Validation Summary: How to Configure ClickHouse Compiled Expression Cache

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration, query settings)
- LLVM JIT compilation
- XML configuration (config.xml, users.xml)
- SQL (system.metrics, system.query_log, ProfileEvents)
- Mermaid diagrams

## Sources Consulted
- ClickHouse Settings.cpp source code (https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Core/Settings.cpp) — verified default values for `compile_expressions`, `compile_aggregate_expressions`, `compile_sort_description`, `min_count_to_compile_expression`, `min_count_to_compile_aggregate_expression`, `min_count_to_compile_sort_description`
- ClickHouse Server Settings docs (https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings) — verified `compiled_expression_cache_size` and `compiled_expression_cache_elements_size` are valid server-level settings
- ClickHouse config.yaml.example (https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.yaml.example) — verified default `compiled_expression_cache_size` of 134217728 bytes (128 MB)
- ClickHouse ProfileEvents.cpp (https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp) — verified `CompileExpressionsMicroseconds`, `CompileFunction`, `CompiledFunctionExecute` are real ProfileEvents
- ClickHouse JIT blog (https://clickhouse.com/blog/clickhouse-just-in-time-compiler-jit) — confirmed background on JIT compilation behavior, `min_count_to_compile_expression` default of 3

## Issues Found
No technical issues found.

All settings names are spelled correctly and reference real ClickHouse settings:
- `compile_expressions`, `compile_aggregate_expressions` — query-level settings, default enabled (1)
- `min_count_to_compile_expression`, `min_count_to_compile_aggregate_expression`, `min_count_to_compile_sort_description` — all default to 3, as stated
- `compiled_expression_cache_size` — default 134217728 bytes (128 MB), as stated
- `compiled_expression_cache_elements_size` — valid server-level setting
- `CompiledExpressionCacheCount` and `CompiledExpressionCacheBytes` — valid system.metrics
- `CompileExpressionsMicroseconds` — valid ProfileEvent

XML configuration syntax (using `<clickhouse>` root element and `<profiles>` in users.xml) is correct. SQL syntax for SET statements, system tables queries, and SETTINGS clauses is valid.

## Review Notes
- The post mentions JIT can provide "10-50% speedup after the warm-up period" — this aligns with ClickHouse's own published benchmarks for aggregation-heavy queries, though actual speedup is highly workload-dependent (can be higher for simple numeric aggregations on large datasets, near zero for queries dominated by I/O or string operations).
- The Mermaid flowchart is a reasonable conceptual model. In reality, the counter is per expression-fingerprint and the compiled artifact is shared across all queries that use the same expression.
- The example uses `<clickhouse>` as the XML root, which is the modern (post-21.3) convention. Older `<yandex>` root tag still works for backward compatibility but `<clickhouse>` is preferred.
- `min_count_to_compile_sort_description` requires `compile_sort_description=1` to take effect; the post does not enable that setting in its examples but does correctly list it in the thresholds table.
