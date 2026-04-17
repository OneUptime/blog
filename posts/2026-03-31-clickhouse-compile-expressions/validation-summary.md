# Validation Summary: How to Use compile_expressions Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- LLVM-based JIT compilation
- ClickHouse settings: `compile_expressions`, `min_count_to_compile_expression`
- ClickHouse system tables: `system.events`, `system.query_log`, `system.build_options`
- ClickHouse XML profile configuration (`users.xml`)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse Settings docs — https://clickhouse.com/docs/operations/settings/settings
- ClickHouse System Events docs — https://clickhouse.com/docs/operations/system-tables/events
- ClickHouse source `Settings.cpp` — https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp
- ClickHouse official blog "JIT in ClickHouse" — https://clickhouse.com/blog/clickhouse-just-in-time-compiler-jit
- LLVM JIT interface PR #2277 — https://github.com/ClickHouse/ClickHouse/pull/2277

## Issues Found
No technical issues found.

Verified the following claims as accurate:
- `compile_expressions` exists and is toggled as 0/1 (Bool setting).
- `min_count_to_compile_expression` defaults to 3.
- Profile event names `CompileFunction` and `CompileExpressionsMicroseconds` are correct and documented in `system.events`.
- ClickHouse uses LLVM (IRBuilder + ORC JIT) for JIT compilation.
- `USE_EMBEDDED_COMPILER` in `system.build_options` is the standard way to detect JIT availability in a build.
- `SETTINGS compile_expressions = 1` works as a per-query setting.
- The `<clickhouse><profiles><default>…</default></profiles></clickhouse>` XML structure in `users.xml` is valid for setting profile defaults.

## Review Notes
- The root tag `<clickhouse>` used in the XML snippet is the modern, preferred form; older ClickHouse configs used `<yandex>`, which is still accepted but not needed to mention here.
- Related profile events like `CompileExpressionsBytes` and `CompiledFunctionExecute` also exist, but the two referenced in the post are sufficient for the monitoring example.
- The post focuses on expression JIT; a sibling setting `compile_aggregate_expressions` (for aggregate-function JIT) is a separate feature and out of scope for this post. Fine to omit.
