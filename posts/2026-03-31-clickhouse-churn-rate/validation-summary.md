# Validation Summary: How to Calculate Churn Rate in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide (SQL recipes for ClickHouse)

## Technologies Covered
- ClickHouse (SQL, window functions, array functions, JOIN semantics, interval arithmetic)
- Churn / retention / MRR analytics patterns

## Sources Consulted
- ClickHouse `lagInFrame` docs — https://clickhouse.com/docs/sql-reference/window-functions/lagInFrame
- ClickHouse JOIN Clause (NULL / default-value semantics and `join_use_nulls`) — https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse Aggregate Function Combinators (`-Distinct`, `-If`) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `groupUniqArray` — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupuniqarray
- ClickHouse Array Functions (`arrayIntersect`, `notEmpty`, `length`) — https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse Operators (INTERVAL arithmetic) — https://clickhouse.com/docs/en/sql-reference/operators
- GitHub Issue #71390 (lagInFrame default value behavior with non-nullable types)
- PR #27184 (window functions GA in v21.10)

## Issues Found

1. **Incomplete first query — "Monthly Active Users Per Period".** The snippet ended with a `WITH monthly_active AS (...)` CTE and no terminating `SELECT`, so it would fail to parse as a standalone query. Added `SELECT month, length(active_users) AS active_count FROM monthly_active ORDER BY month;` so the example is runnable.

2. **Incorrect first-row filter with `lagInFrame` on an `Array` column.** The "Event-Based Active Users" query used `WHERE prev_users IS NOT NULL` to drop the first month. In ClickHouse, `lagInFrame` on a non-nullable column (Arrays cannot be `Nullable`) returns the type's default — an empty array `[]`, not `NULL` — so the filter never fired and the first month would have shown a spurious 100% churn. Replaced with `WHERE notEmpty(prev_users)`.

3. **Broken `GROUP BY` and `IS NULL` check in MRR churn query.** Two related bugs:
   - `GROUP BY curr.month` grouped all churned users under a single bucket, because ClickHouse's default LEFT JOIN fills unmatched right-side columns with the type default (Date `1970-01-01`), not the per-user month they churned in. Changed to `GROUP BY prev.month + INTERVAL 1 MONTH` and selected that expression as `month`.
   - `sumIf(prev.mrr, curr.user_id IS NULL)` only works when `join_use_nulls = 1`; otherwise unmatched rows get `user_id = 0`, not NULL. Added `SETTINGS join_use_nulls = 1` to the outer query so the `IS NULL` check is meaningful.

## Review Notes
- `groupArrayDistinct` is valid (via the `-Distinct` combinator). `groupUniqArray` is the more idiomatic / older alternative; either works.
- `lagInFrame` and ordinary window functions have been GA since ClickHouse v21.10 (2021), so no `allow_experimental_window_functions` setting is needed today.
- `arrayIntersect`, `toStartOfMonth`, `toIntervalMonth`, `dateDiff`, `arrayJoin`, `arrayMap`, and `INTERVAL N MONTH` arithmetic are all valid and used correctly elsewhere in the post.
- The "Monthly Active Users Per Period" query expands each subscription into one row per active month via `arrayJoin(arrayMap(...))`. This works but can be expensive for long subscription histories; for large fact tables, aggregating from a daily/monthly event stream (as the second section suggests) is usually cheaper.
- For very large user sets, `groupArrayDistinct` + `arrayIntersect` can be memory-heavy. A `uniqExact`/`bitmap`-based approach (e.g., `groupBitmapState` and `bitmapAnd`) scales better, though it's out of scope for this tutorial.
