# Validation Summary: How to Use groupArray() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (aggregate functions)
- SQL
- ClickHouse array functions: `groupArray`, `groupArray(N)`, `groupUniqArray`, `arraySort`, `arrayReverseSort`, `arrayDistinct`, `arrayJoin`, `arrayMap`, `arraySlice`
- ClickHouse `-If` combinator (`groupArrayIf`)
- ClickHouse system tables (`system.query_log`)
- MergeTree table engine

## Sources Consulted
- ClickHouse `groupArray` reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse `groupUniqArray` reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupuniqarray
- ClickHouse aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `arrayJoin` function: https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse Tuple data type: https://clickhouse.com/docs/en/sql-reference/data-types/tuple
- ClickHouse `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
- **"Most recent N" subquery pattern was unreliable.** The original example showed `SELECT groupArray(3)(action) FROM (SELECT ... ORDER BY action_time DESC) GROUP BY user_id`. ClickHouse does not officially guarantee that an inner `ORDER BY` is preserved through an outer `GROUP BY` — this can break with parallel/distributed aggregation or optimizer rewrites. Replaced with the reliable tuple-collection pattern using `arrayMap`, `arraySlice`, and `arrayReverseSort` over `groupArray((action_time, action))`, and updated the surrounding explanation to note the non-guarantee.

## Review Notes
- All other claims verified against the official ClickHouse documentation: `groupArray(max_size)(x)` parametric form, the `-If` combinator (`groupArrayIf`), `groupUniqArray()`, tuple element access (`.2`) inside `arrayMap` lambdas, `arrayJoin` for array-to-rows expansion, and `system.query_log` columns (`query_id`, `memory_usage`, `query`, `type`, `event_time`) including the `type = 'QueryFinish'` enum value — all correct.
- Minor stylistic note (not changed): the `query LIKE '%groupArray%'` filter in the monitoring example would also match the monitoring query itself; this is a known harmless quirk of self-introspecting query_log queries.
- The post correctly recommends `groupUniqArray()` over `arrayDistinct(groupArray(...))` for memory efficiency, which matches ClickHouse guidance.
