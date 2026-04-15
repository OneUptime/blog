# Validation Summary: How to Prioritize Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (query priority, workload scheduling, settings profiles, system tables)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation: Settings — `priority` (https://clickhouse.com/docs/en/operations/settings/settings#priority)
- ClickHouse official documentation: Settings — `os_thread_priority` / `os_threads_nice_value_query` (https://clickhouse.com/docs/en/operations/settings/settings#os_thread_priority)
- ClickHouse official documentation: CREATE WORKLOAD (https://clickhouse.com/docs/en/sql-reference/statements/create/workload)
- ClickHouse official documentation: Workload Scheduling (https://clickhouse.com/docs/en/operations/workload-scheduling)
- ClickHouse official documentation: CREATE SETTINGS PROFILE (https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile)
- ClickHouse official documentation: system.processes (https://clickhouse.com/docs/en/operations/system-tables/processes)
- ClickHouse official documentation: KILL QUERY (https://clickhouse.com/docs/en/sql-reference/statements/kill)
- ClickHouse source code (Settings.h) for setting definitions and defaults

## Issues Found

1. **`priority = 0` incorrectly described as highest priority.** The `priority` setting uses 1 as the highest priority; 0 (the default) means "do not use priorities" and disables the priority mechanism entirely. Fixed all occurrences: changed `SET priority = 0` and `SETTINGS priority = 0` to use `priority = 1` for high-priority queries. Updated the explanatory text to clarify that 0 disables priority scheduling.

2. **`CREATE WORKLOAD` used `PARENT` keyword instead of `IN`.** The correct ClickHouse syntax for specifying a parent workload is `CREATE WORKLOAD child IN parent`, not `CREATE WORKLOAD child PARENT parent`. Fixed both `CREATE WORKLOAD` statements.

3. **Workload scheduling version incorrectly stated as v24.1.** SQL-based workload management (`CREATE WORKLOAD` / `CREATE RESOURCE`) was introduced in ClickHouse v24.11 (November 2024), not v24.1. Fixed the version reference.

4. **Summary incorrectly attributed OS-level thread scheduling to the `priority` setting.** The `priority` setting is a ClickHouse-internal query scheduling mechanism. OS-level thread scheduling is handled by the separate `os_thread_priority` setting. Fixed the summary to correctly distinguish between the two mechanisms.

## Review Notes
- The `os_thread_priority` setting has been renamed to `os_threads_nice_value_query` in recent ClickHouse versions, with `os_thread_priority` kept as a backward-compatible alias. Both names work, so the post's usage is fine.
- The `os_thread_priority` range is actually -20 to 19 (full Linux nice range), not just 0 to 19. The examples shown (0 and 19) are valid values, but the post does not mention that negative values are possible for above-normal priority. This is not incorrect but is incomplete.
- In the workload section, `priority = 0` is valid for workload-level priority (which has different semantics from the query-level `priority` setting). Workload priority determines scheduling order among sibling workloads, and 0 is a valid value there.
- The weight-based bandwidth claim ("90% of available IO bandwidth") is a simplification. Weights determine proportional resource sharing among siblings at the same priority level. Since the `interactive` workload also has a higher priority (0 vs 100), it would actually be served first regardless of weight — weight only matters when siblings have equal priority.
- The `Settings['priority'] > 5` comparison in the runaway query detection section relies on ClickHouse's implicit string-to-integer cast. While this works in practice, it is inconsistent with the explicit `CAST(Settings['priority'] AS Int64)` used in the earlier monitoring query.
