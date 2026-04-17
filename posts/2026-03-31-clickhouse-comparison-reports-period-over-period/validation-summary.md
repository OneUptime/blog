# Validation Summary: How to Build Comparison Reports (Period over Period) in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse window functions (`lagInFrame`)
- ClickHouse conditional aggregation combinators (`sumIf`)
- ClickHouse date/time functions (`today`, `toStartOfMonth`, `toYear`, `INTERVAL`)
- MergeTree table engine

## Sources Consulted
- ClickHouse SQL Reference — CREATE TABLE / MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Aggregate function combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse Date/Time functions (`today`, `toStartOfMonth`, `toYear`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse INTERVAL / date arithmetic: https://clickhouse.com/docs/en/sql-reference/data-types/special-data-types/interval
- ClickHouse window functions (`lagInFrame`, `leadInFrame`): https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse JOIN syntax: https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
No technical issues found.

All SQL examples are syntactically correct and semantically sound:
- `CREATE TABLE ... ENGINE = MergeTree() ORDER BY (day, region)` is valid.
- `current` and `prior` are not reserved keywords in ClickHouse; they work fine as table aliases.
- `today() - INTERVAL 1 MONTH`, `today() - 7`, and `prior.day + INTERVAL 7 DAY` are all valid ClickHouse date arithmetic forms.
- `sumIf(column, condition)` is the correct form of the `-If` combinator.
- `toStartOfMonth`, `toYear`, `nullIf` are all real ClickHouse functions used correctly.
- `lagInFrame(sum(revenue), 7) OVER (ORDER BY day)` is valid. With the default frame (`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`) and a unique-per-row `ORDER BY` key, lookups 7 rows back are returned correctly.
- `UNION ALL` example and overall query logic are correct.

## Review Notes
- For the window-function example, an explicit `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` frame would be equally valid and makes intent clearer, but it is not required — ClickHouse's default frame handles this case correctly.
- The self-join example (`WHERE current.day >= today() - 7`) surfaces the last 8 days (today plus 7 prior) — this is a reasonable interpretation of "this week vs last week" for most BI use cases.
- The LEFT JOIN in the week-over-week example will yield `NULL` for `prior.revenue` on days where no matching prior-week row exists, causing the `pct_change` calculation to return `NULL` (division involving NULL). Readers implementing this in production may want to wrap `prior.revenue` with `nullIf(..., 0)` or `ifNull(..., 0)` to harden against missing prior data — but this is a stylistic refinement, not a correctness issue.
