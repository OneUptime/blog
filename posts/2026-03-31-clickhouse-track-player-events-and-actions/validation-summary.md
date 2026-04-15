# Validation Summary: How to Track Player Events and Actions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, aggregate functions)
- SQL (schema design, subqueries, tuple IN expressions, groupArray)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE, MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Data types (DateTime64, LowCardinality, UInt*, Float32) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: Aggregate functions (count, uniq, groupArray, avg) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: dateDiff function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation: Arithmetic operators (division returns Float64 for integer operands) — https://clickhouse.com/docs/en/sql-reference/operators#arithmetic-operators
- ClickHouse documentation: IN operator with tuples — https://clickhouse.com/docs/en/sql-reference/operators/in

## Issues Found
- **Action Sequences query: uncorrelated subquery** — The `IN` subquery that finds `sequence_num - 1` for death events was not scoped by `player_id` and `session_id`. This meant it matched sequence numbers globally across all players and sessions, producing incorrect results. For example, if player A died at sequence_num 10, any player's action at sequence_num 9 would be included regardless of whether it was related. Fixed by changing the scalar `sequence_num IN (SELECT sequence_num - 1 ...)` to a tuple match: `(player_id, session_id, sequence_num) IN (SELECT player_id, session_id, sequence_num - 1 ...)`.

## Review Notes
- The Action Sequences query only captures the single action immediately before each death (sequence_num - 1). To capture longer sequences leading to failure (e.g., the last 5 actions), the filter would need to use a range like `BETWEEN death_seq - 5 AND death_seq - 1`. The current approach is functional but limited to one-action patterns.
- The Actions Per Minute query uses `dateDiff('minute', ...)` which truncates to whole minutes. For players with very short sessions (under 60 seconds), the HAVING clause correctly filters them out, but sessions just over one minute may show inflated rates. Using `dateDiff('second', ...) / 60.0` would give finer granularity.
