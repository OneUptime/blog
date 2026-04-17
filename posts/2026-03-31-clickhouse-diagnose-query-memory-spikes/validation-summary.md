# Validation Summary: How to Diagnose ClickHouse Query Memory Spikes

## Status
validated

## Post Type
Tutorial / Diagnostic Guide

## Technologies Covered
- ClickHouse
- ClickHouse system tables (`system.query_log`, `system.processes`, `system.trace_log`)
- ClickHouse introspection functions (`demangle`, `addressToSymbol`)
- ClickHouse memory profiler settings
- ClickHouse query complexity / memory limit settings

## Sources Consulted
- ClickHouse `system.query_log` docs: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse `system.processes` docs: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse `system.trace_log` docs: https://clickhouse.com/docs/en/operations/system-tables/trace_log
- ClickHouse query complexity settings: https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse general settings: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse introspection functions: https://clickhouse.com/docs/en/sql-reference/functions/introspection
- ClickHouse `QueryLog.cpp` source on GitHub master branch (verified column list directly)

## Issues Found
- **`peak_memory_usage` column does not exist in `system.query_log`.** The Step 1 query selected and ordered by `peak_memory_usage`, but `system.query_log` only exposes a single `memory_usage` column (UInt64), which records the peak memory consumption of the query. Verified against both the official docs and the current `QueryLog.cpp` source on master. Fixed by removing the `peak_memory_usage` projection and changing the `ORDER BY` to `memory_usage DESC`. Also reworded the Summary section to clarify that `memory_usage` already represents peak consumption.

## Review Notes
- All other technical claims verified as correct:
  - `system.processes` columns (`query_id`, `user`, `elapsed`, `memory_usage`, `query`) are all present.
  - `memory_profiler_sample_probability` and `memory_profiler_step` are valid settings.
  - `system.trace_log` supports `trace_type = 'MemorySample'` and exposes a `size` column for memory-related traces.
  - `demangle()` and `addressToSymbol()` are valid introspection functions. Note for readers: these require `SET allow_introspection_functions = 1` and the `clickhouse-common-static-dbg` package installed on the server; the post does not mention this prerequisite, which is a minor gap but not technically incorrect.
  - `max_bytes_before_external_group_by`, `max_memory_usage`, and `max_memory_usage_for_user` are all valid query complexity settings.
  - `'QueryFinish'` is a valid value for the `type` enum in `system.query_log` (alongside `QueryStart`, `ExceptionBeforeStart`, `ExceptionWhileProcessing`).
- The advice to put the smaller table on the right side of a JOIN is correct for ClickHouse's default hash join behavior, where the right table is loaded into memory.
