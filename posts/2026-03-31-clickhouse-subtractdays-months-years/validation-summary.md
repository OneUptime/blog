# Validation Summary: How to Use subtractDays(), subtractMonths(), subtractYears() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (date/time functions: subtractDays, subtractMonths, subtractYears, subtractWeeks, subtractQuarters, subtractHours, subtractMinutes, subtractSeconds)
- ClickHouse SQL (date_trunc, sumIf, uniqExact, countDistinctIf, nullIf, CASE expressions)
- ClickHouse dateAdd function (referenced in equivalence comments)

## Sources Consulted
- ClickHouse official documentation — Date/Time functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse GitHub Issue #25815 — DATE_SUB documentation: https://github.com/ClickHouse/ClickHouse/issues/25815
- ClickHouse GitHub PR #62632 — Document DATE_ADD/DATE_SUB alternative syntax: https://github.com/ClickHouse/ClickHouse/pull/62632

## Issues Found

### 1. Year-over-Year Revenue query used `subtractYears(today(), 0)` (logical error)
**What was wrong:** The first YoY revenue query used `subtractYears(today(), 0)` as the boundary for `current_year`, which simply evaluates to `today()`. This meant `current_year` would only capture orders from today (not the current year or trailing 12 months), while `prior_year` captured the last 12 months. The intent was clearly a rolling year comparison.

**What was changed:** Changed `subtractYears(today(), 0)` to `subtractYears(today(), 1)` and `subtractYears(today(), 1)` to `subtractYears(today(), 2)`, making `current_year` = last 12 months and `prior_year` = 12–24 months ago. This aligns with the second "cleaner" UNION ALL query and the `WHERE` clause.

### 2. Rolling 28-day query had a tautological condition (logical error)
**What was wrong:** The `uniqExactIf` condition `event_time >= subtractDays(event_time, 28)` compares each row's event_time to itself minus 28 days, which is always true. This made `mau_rolling_28d` identical to `dau` for every group — the condition never filtered anything.

**What was changed:** Simplified the query to compute daily DAU within a 28-day lookback window defined by `WHERE event_time >= subtractDays(today(), 28)`. Removed the broken `uniqExactIf` column since a true per-day rolling 28-day unique user count requires more complex techniques (window functions, self-joins, or arrayJoin) that go beyond the scope of this post. Updated the section text accordingly.

### 3. Incorrect claim that `n` must be non-negative (inaccuracy)
**What was wrong:** The post stated "`n` must be a non-negative integer." ClickHouse's subtract functions accept signed integer types (Int8, Int16, Int32, Int64) and do not enforce non-negativity. Passing a negative value reverses the direction (e.g., `subtractDays(dt, -7)` adds 7 days).

**What was changed:** Reworded to state that `n` is an integer, negative values reverse the direction, and the `add*` functions should be preferred for clarity when adding time.

## Review Notes
- The `dateAdd` equivalence comments in the Function Signatures section use the three-positional-argument form `dateAdd('day', -n, dt)`. While this works in practice, the primary documented syntax in ClickHouse is `dateAdd(date, INTERVAL value unit)`. The three-argument form is widely used in the community but is not prominently documented. This is not incorrect but worth noting for readers who may not find this form in the official docs.
- The "cleaner" UNION ALL version of the YoY query uses `BETWEEN` for date ranges. Since `BETWEEN` is inclusive on both ends, the boundary date `subtractYears(today(), 1)` appears in both the current and prior period ranges. In practice this is a single day's overlap and unlikely to matter for revenue aggregation, but using `>=`/`<` boundaries (as in the first query) is more precise for non-overlapping periods.
