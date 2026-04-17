# Validation Summary: How to Calculate DAU, WAU, MAU in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse aggregate functions (`uniq`, `uniqExact`, `uniqState`, `uniqMerge`, `uniqExactState`, `uniqExactMerge`, `uniqExactIf`)
- ClickHouse window functions (OVER clause with `ROWS BETWEEN ... PRECEDING AND CURRENT ROW`)
- Date functions (`toDate`, `toYYYYMM`, `today()`)

## Sources Consulted
- [ClickHouse Window Functions docs](https://clickhouse.com/docs/en/sql-reference/window-functions)
- [ClickHouse count() function docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count)
- [ClickHouse uniqExact docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqexact)
- [Altinity KB: Cumulative Anything (rolling uniq pattern)](https://kb.altinity.com/altinity-kb-queries-and-syntax/cumulative-unique/)
- [Altinity: ClickHouse Window Functions Current State of the Art](https://altinity.com/blog/clickhouse-window-functions-current-state-of-the-art)
- [Altinity KB: Functions to count uniqs](https://kb.altinity.com/altinity-kb-schema-design/uniq-functions/)

## Issues Found

1. **Rolling WAU query used `uniqExact(user_id) OVER (...)` with `GROUP BY day`** — this is semantically broken in ClickHouse. Window functions run after `GROUP BY`, so once rows are collapsed per day `user_id` is no longer available as a raw column. The canonical ClickHouse pattern for rolling distinct counts is to produce per-day aggregate states with `uniqExactState`, then combine them across the window with `uniqExactMerge` (see Altinity "Cumulative Anything" KB article). Rewrote the query to aggregate into a subquery with `uniqExactState(user_id)` and wrap the window with `uniqExactMerge(state)` using `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`.

2. **Rolling MAU query had the same flaw** — `uniq(user_id) OVER (ORDER BY toDate(event_time) RANGE BETWEEN 29 PRECEDING AND CURRENT ROW)` with `GROUP BY day`. Rewrote using `uniqState` / `uniqMerge` over a daily-aggregated subquery with `ROWS BETWEEN 29 PRECEDING AND CURRENT ROW`.

3. **Stickiness query's MAU CTE had the same flaw** — fixed by aggregating the event data per day with `uniqState` first and then applying `uniqMerge` in the window.

4. **`countDistinct` and `countDistinctIf` are not documented ClickHouse functions** — ClickHouse supports `count(DISTINCT expr)` syntax (controlled by the `count_distinct_implementation` setting) and the `uniq*` family, but `countDistinct`/`countDistinctIf` are not part of the documented public API. Replaced with `uniqExact(user_id)` and `uniqExactIf(user_id, is_new_user)`, which are the standard ClickHouse equivalents.

## Review Notes
- The filter `event_time >= today() - 30` works because subtracting an integer from a Date/DateTime yields a Date shifted by that many days. For large tables, partitioning by month and using explicit date range predicates is usually more efficient.
- The `first_seen` column in the "New vs. Returning Users" subquery is computed but unused. Kept as-is to avoid structural changes, but it could be removed in a future edit.
- Switching the frame from `RANGE` to `ROWS` is correct only if every day in the range has a row. In practice that requires at least one event per day; for sparse data consider densifying the daily series (e.g. with `arrayJoin` over a date range) before applying the window.
- `uniq` is HyperLogLog-style adaptive sampling (approximate); `uniqExact` is exact but memory-bound. The post's guidance to pick `uniq` for billions of rows and `uniqExact` for smaller datasets is accurate.
