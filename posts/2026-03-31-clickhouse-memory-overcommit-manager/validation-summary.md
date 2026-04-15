# Validation Summary: How to Use Memory Overcommit Manager in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (memory overcommit manager)
- ClickHouse system tables (`system.events`, `system.processes`, `system.query_log`)
- ClickHouse server and profile configuration (XML)

## Sources Consulted
- ClickHouse official docs: Memory Overcommit (https://clickhouse.com/docs/en/operations/settings/memory-overcommit)
- ClickHouse official docs: Settings (https://clickhouse.com/docs/en/operations/settings/settings)
- ClickHouse official docs: Server Configuration Parameters (https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings)
- ClickHouse official docs: system.events (https://clickhouse.com/docs/en/operations/system-tables/events)
- ClickHouse official docs: system.processes (https://clickhouse.com/docs/en/operations/system-tables/processes)
- ClickHouse official docs: system.query_log (https://clickhouse.com/docs/en/operations/system-tables/query_log)

## Issues Found

1. **Wrong setting name `global_memory_usage_overcommit_max_wait_microseconds`**: The post used a non-existent setting name with a `global_` prefix. The correct setting name is `memory_usage_overcommit_max_wait_microseconds`. Fixed the SQL `SET` statement and all references.

2. **Inverted behavior description for wait timeout**: The post claimed that when the wait timeout expires, "a query proceeds despite overcommit conditions." The actual behavior is the opposite — if the timeout expires without enough memory being freed, the query is **killed** with a `MEMORY_LIMIT_EXCEEDED` exception. Fixed the description.

3. **Incorrect overcommit selection mechanism**: The post stated the overcommit manager "picks the query consuming the most memory above its soft limit." The actual mechanism selects the query with the **biggest overcommit ratio** (`allocated_bytes / memory_overcommit_ratio_denominator`), which is not the same thing. Different queries can have different denominator values. Fixed in the "How Overcommit Works" section and the summary.

4. **"Configurable multiplier" mischaracterization**: The post described the denominator as enabling a "configurable multiplier" for overcommit (e.g., "2x overcommit"). The `memory_overcommit_ratio_denominator` is a denominator in a ratio calculation, not a multiplier that defines a ceiling. Fixed the XML comment and the explanation to accurately describe the ratio mechanism.

5. **`MemoryAllocatorPurge` listed as overcommit event**: This event is a general jemalloc allocator metric, not specific to the overcommit manager. Additionally, the SQL query used `LIKE '%MemoryOvercommit%'` which would not match `MemoryAllocatorPurge`. Removed it from the key events list.

6. **`break` overflow mode recommendation**: The post recommended using `break` overflow mode with hard memory limits for interactive dashboards, but this overflow mode is primarily documented for row/byte count limits, not memory limits. Changed to a more accurate recommendation of conservative `max_memory_usage` settings.

## Review Notes
- The `system.processes` and `system.query_log` queries are syntactically correct and reference valid columns.
- The `max_server_memory_usage_to_ram_ratio` setting and its description are accurate.
- The `memory_overcommit_ratio_denominator` and `memory_overcommit_ratio_denominator_for_user` are both real, correctly named settings.
- The `MemoryOvercommitWaitTimeMicroseconds` event name and description are accurate.
