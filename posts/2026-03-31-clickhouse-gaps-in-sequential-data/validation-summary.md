# Validation Summary: How to Find Gaps in Sequential Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse window functions (`leadInFrame`)
- ClickHouse array/block functions (`neighbor`)
- ClickHouse date functions (`dateDiff`)
- SQL gap-detection patterns

## Sources Consulted
- ClickHouse Window Functions reference: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `leadInFrame` reference: https://clickhouse.com/docs/en/sql-reference/window-functions/leadInFrame
- ClickHouse `neighbor` reference: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#neighbor
- ClickHouse SELECT syntax reference: https://clickhouse.com/docs/en/sql-reference/statements/select
- ClickHouse `dateDiff` reference: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff

## Issues Found

1. **First query had `HAVING` after `ORDER BY`** — this is invalid ClickHouse SELECT syntax. The documented clause order requires `HAVING` to appear before `ORDER BY`. Swapped the two clauses so the query parses correctly.

2. **`leadInFrame(...)  OVER (ORDER BY ...)` used the default frame, which breaks lookahead.** When `ORDER BY` is present in a window spec without an explicit frame, ClickHouse uses `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Because `leadInFrame` respects the frame, it would return the default value (0) for every row — no gaps would ever be detected. The ClickHouse docs explicitly recommend `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to replicate standard `lead()` behavior. Added this frame specification to all four `leadInFrame` usages in the post (Window Functions for Gap Detection, Finding Time Gaps in a Series, Detecting Gaps per Group, Counting Total Missing IDs).

## Review Notes
- `neighbor()` is a legacy ClickHouse function that operates on the physical block order during processing, not on the post-`ORDER BY` ordering. The first query relies on the fact that `events` is typically stored ordered by `id` (the primary key) so the block order matches the desired order. The post could mention this caveat in the future, but the usage is acceptable when the table's sort key matches the argument to `neighbor`.
- ClickHouse does not currently implement the standard SQL `lead()` / `lag()` functions — only `leadInFrame` / `lagInFrame`. This is why the explicit frame clause is necessary.
- `dateDiff('unit', start, end)` signature and the `'minute'` / `'second'` unit strings are correct per the ClickHouse docs.
