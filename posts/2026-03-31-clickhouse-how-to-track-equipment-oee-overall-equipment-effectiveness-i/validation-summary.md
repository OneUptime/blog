# Validation Summary: How to Track Equipment OEE in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree family engines, window functions, CTEs)
- OEE (Overall Equipment Effectiveness) manufacturing KPI
- Time-series / IoT data modeling

## Sources Consulted
- ClickHouse window functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse `lead` / `lag`: https://clickhouse.com/docs/sql-reference/window-functions/lead
- ClickHouse WITH / CTE: https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse arithmetic functions (`/` returns Float64): https://clickhouse.com/docs/sql-reference/functions/arithmetic-functions
- ClickHouse `LowCardinality`: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse `ReplacingMergeTree`: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse date/time functions (`dateDiff`, `today`, `toDate`, `toYYYYMM`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- Standard OEE formula (Availability × Performance × Quality) — widely documented in manufacturing/lean literature

## Issues Found

1. **Availability query — marker-row excluded by strict `<` bound.**
   The inner subquery used `WHERE ts >= shift_start AND ts < shift_end`, which excluded the `2026-03-31 14:00:00` "shift_end / idle" marker row. Since `lead(ts)` returns NULL for the last row in the partition, the 10:30→14:00 `running` interval (3.5 h, 12 600 s) was lost from the sum, producing ~48% availability instead of the correct ~94%. Changed the bound to `ts <= shift_end` so the marker row is present in the window and the last running interval gets a non-NULL `lead(ts)` equal to `shift_end`. The marker row itself contributes zero because its state is `idle`.

2. **Full OEE query — window function nested inside aggregate function.**
   ClickHouse does not allow a window function (`lead(ts) OVER (...)`) to be used directly as an argument to an aggregate function (`sum(if(state='running', dateDiff('second', ts, lead(ts) OVER (...)), 0))`). Window functions are evaluated in a separate phase from aggregates and cannot be nested this way. Split the logic into two CTEs: a `state_durations` CTE that computes `lead(ts)` and the per-row `duration_sec` without aggregation, and a `run_time` CTE that then aggregates `sum(if(state='running', duration_sec, 0))`. This matches the structure already used in the standalone Availability query.

3. **Full OEE query — same marker-row bound bug as (1).**
   The run-time CTE also used `ts < shift_params.shift_end`. Changed to `ts <= shift_params.shift_end` so the shift-end marker is included for `lead(ts)` continuity.

## Review Notes
- The ClickHouse-specific pattern `WITH cte AS (SELECT <scalar>) ... (SELECT * FROM cte)` is valid. A more idiomatic alternative is `WITH <expr> AS name` directly, but the current usage is correct.
- `good_count / total_count` with both `UInt32` columns correctly returns `Float64` in ClickHouse (the `/` operator always returns Float64), so the percentage math is sound.
- `today() - 30` relies on Date arithmetic (subtracting an integer number of days); this works, though `today() - INTERVAL 30 DAY` or `subtractDays(today(), 30)` would be more explicit.
- An alternative to the `ts <= shift_end` fix is `lead(ts, 1, toDateTime(shift_end)) OVER (...)`, which supplies the shift boundary as the default. Either works; the chosen fix is the smaller edit.
- The post's example production-count insert places `total_count` at `14:00:00` (shift end), which is why the `BETWEEN shift_start AND shift_end` inclusive predicate correctly matches that row.
