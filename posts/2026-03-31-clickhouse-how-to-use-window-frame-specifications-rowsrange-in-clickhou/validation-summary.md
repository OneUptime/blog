# Validation Summary: How to Use Window Frame Specifications (ROWS/RANGE) in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL window functions
- ROWS and RANGE frame specifications
- MergeTree table engine
- ClickHouse date/time conversion functions (`toUnixTimestamp`, `toUInt32`)

## Sources Consulted
- [ClickHouse Window Functions documentation](https://clickhouse.com/docs/sql-reference/window-functions)
- [ClickHouse window functions tests (01591_window_functions.sql)](https://github.com/ClickHouse/ClickHouse/blob/master/tests/queries/0_stateless/01591_window_functions.sql)
- [ClickHouse PR #21895 — float RANGE OFFSET and lag/lead_in_frame](https://github.com/ClickHouse/ClickHouse/pull/21895)
- [Altinity — ClickHouse Window Functions: Current State of the Art](https://altinity.com/blog/clickhouse-window-functions-current-state-of-the-art)

## Issues Found
- **Inconsistent default-frame claim.** In the "Frame Boundary Options" section, the line `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW   -- running total (default with ORDER BY)` incorrectly labeled the ROWS form as the default. ClickHouse's documented default when `ORDER BY` is present is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (which the post itself correctly states later in the "Default Frame Behavior" section). Removed the misleading parenthetical so the comment now reads simply `-- running total`, keeping the post internally consistent with its own later (correct) statement of the default.

## Review Notes
- All RANGE-with-numeric-offset examples are valid: ClickHouse supports RANGE OFFSET frames over numeric types (including `toUnixTimestamp(DateTime)` and `toUInt32(Date)`), which is why the post's workaround of converting to seconds/day-ordinals is the right pattern. `INTERVAL` syntax for Date/DateTime RANGE offsets remains unsupported — the post correctly avoids it.
- The "ROWS vs RANGE with Ties" worked example is correct: for `RANGE BETWEEN 1 PRECEDING AND CURRENT ROW` with ts values `[10, 10, 20, 30]`, both rows with `ts=10` share the frame `{rows 1,2}`, while `ROWS BETWEEN 1 PRECEDING AND CURRENT ROW` yields physical-position windows as listed.
- Minor: the "No ORDER BY" default frame is often written as `RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` per the SQL standard; the post writes it as `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. Both describe the same row set (the entire partition) with identical semantics when there is no ORDER BY, so this was left as-is.
- The GROUPS frame mode is not supported in ClickHouse. The post does not mention it, which is fine for scope.
