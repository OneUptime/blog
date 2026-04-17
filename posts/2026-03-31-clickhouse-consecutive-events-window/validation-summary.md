# Validation Summary: How to Find Consecutive Events with Window Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL window functions)
- ClickHouse `lag()` / `lagInFrame()` functions
- ClickHouse `dateDiff()` date function
- ClickHouse `sum() OVER (...)` cumulative aggregation
- MergeTree table engine
- Gaps-and-islands SQL pattern

## Sources Consulted
- ClickHouse Window Functions reference: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `lag` window function docs: https://clickhouse.com/docs/en/sql-reference/window-functions/lag
- ClickHouse `lagInFrame` window function docs: https://clickhouse.com/docs/en/sql-reference/window-functions/lagInFrame
- ClickHouse `dateDiff` function docs: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **Description metadata inaccuracy** — The front-matter description claimed the streak isolation technique was "ROW_NUMBER() minus a group counter", but the post never uses `ROW_NUMBER()`. The actual technique is a cumulative `SUM()` of gap flags. Corrected the description to reflect the approach that is actually demonstrated.

2. **Introductory paragraph inaccuracy** — The intro stated ClickHouse "window functions - specifically `lag()` and `row_number()` - provide the building blocks for this pattern". `row_number()` is not used anywhere in the post; the real building blocks are `lag()` and a cumulative `sum()`. Updated the sentence accordingly.

3. **Invalid gaps-and-islands technique reference** — Step 3 of the "Islands and Gaps" list read: "Use `row_number() - dense_rank()` or a cumulative sum of gap flags ...". `row_number() - dense_rank()` is not a recognized gaps-and-islands technique (the classic row-number trick subtracts two `row_number()` computations over different orderings, or subtracts `row_number()` from a date-as-integer, not `dense_rank()`). Removed the incorrect alternative, leaving the correct cumulative-sum technique, which is what the post actually demonstrates.

## Review Notes

- SQL syntax verified against current ClickHouse docs: `lag(column, offset, default) OVER (PARTITION BY ... ORDER BY ...)` is supported. `lag()` is effectively `lagInFrame()` with a full-partition frame and matches standard SQL semantics. Using `lag(login_date, 1, login_date)` so the first row reports a zero-day difference is a sound and idiomatic pattern here.
- `dateDiff('day', start, end)` correctly returns the integer count of day-boundary crossings; for `Date` inputs this equals whole days between, so the `> 1` gap test is correct.
- The `sum(is_gap) OVER (PARTITION BY user_id ORDER BY login_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` cumulative-sum pattern is valid ClickHouse window syntax and correctly produces monotonically increasing streak group ids.
- Walked through the sample data by hand: User 1 yields streak_group 0 (Jan 1–3, 3 days) and streak_group 1 (Jan 5–8, 4 days); User 2 yields streak_group 0 (Jan 1, 1 day) and streak_group 1 (Jan 3–6, 4 days). These match the outputs the post asserts.
- The service-events status-change example was also walked through manually and produces four contiguous run groups (ok, error×3, ok, error×2) as implied by the narrative, so the transition-as-gap technique is correctly applied.
- Minor stylistic note (not fixed, not a technical error): the post could optionally use `lagInFrame()` to be explicit about frame semantics, but `lag()` is well-defined in current ClickHouse and works as intended here.
