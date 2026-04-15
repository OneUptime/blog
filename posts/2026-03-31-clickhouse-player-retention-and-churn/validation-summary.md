# Validation Summary: How to Analyze Player Retention and Churn in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, aggregate function combinators)
- Gaming analytics concepts (cohort retention, D1/D7/D30 metrics, churn identification)

## Sources Consulted
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on aggregate function combinators (-If suffix): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation on `countDistinct` / `uniq`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse documentation on `dateDiff`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation on `numbers()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/numbers
- ClickHouse documentation on `CREATE TABLE ... AS SELECT`: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse documentation on arithmetic operators (division returns Float64): https://clickhouse.com/docs/en/sql-reference/operators#arithmetic

## Issues Found

1. **Retention Curve query — missing `game_id` in LEFT JOIN**: The LEFT JOIN to `player_sessions` matched only on `player_id`, omitting `game_id`. Since `player_first_session` contains per-game rows, this would incorrectly count sessions from other games as retention events. Added `AND p.game_id = s.game_id` to the LEFT JOIN condition for consistency with the D1/D7/D30 query.

2. **Retention by Platform query — ambiguous `platform` column**: The query joined `player_sessions` twice (as `install_session` and `s`), both of which have a `platform` column. The unqualified reference to `platform` in SELECT, GROUP BY, and ORDER BY would cause a ClickHouse "Ambiguous column" error. Qualified all references as `install_session.platform`.

3. **Retention by Platform query — missing `game_id` in both JOINs**: Neither the INNER JOIN to `install_session` nor the LEFT JOIN to `s` included `game_id` matching. Added `p.game_id = install_session.game_id` and `p.game_id = s.game_id` to the respective JOIN conditions.

## Review Notes
- The `CREATE TABLE player_first_session AS SELECT ...` statement omits an explicit ENGINE and ORDER BY. In ClickHouse 22.x+, this defaults to MergeTree with `ORDER BY tuple()`, which is functional but not ideal for production. Earlier versions may default to the Memory engine. For a tutorial context this is acceptable.
- The churn identification query correctly uses ClickHouse's support for alias references in HAVING clauses.
- All uses of `countDistinctIf` are valid — ClickHouse supports the `-If` combinator on `countDistinct` (an alias for `uniq`).
- Division of integer aggregate results with `/` correctly returns Float64 in ClickHouse (unlike many other databases), so the retention percentage calculations are correct without explicit casting.
