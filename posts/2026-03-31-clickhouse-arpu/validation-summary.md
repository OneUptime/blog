# Validation Summary: How to Calculate Average Revenue Per User (ARPU) in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- MergeTree table engine
- ClickHouse aggregate functions (`uniq`, `sum`, `quantile`)
- ClickHouse date/time functions (`toStartOfMonth`, `dateDiff`, `today`)
- Common Table Expressions (CTEs)

## Sources Consulted
- ClickHouse SQL reference — Data Types: https://clickhouse.com/docs/en/sql-reference/data-types (UUID, UInt64, Decimal, DateTime)
- ClickHouse — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse — Date/Time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions (`toStartOfMonth`, `today`, `dateDiff`)
- ClickHouse — Aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference (`uniq`, `sum`, `quantile`)
- ClickHouse — Conditional/math functions: `greatest`
- ClickHouse — INTERVAL operator and date arithmetic
- ClickHouse — WITH clause / CTE support

## Issues Found
- **Misleading/incorrect comments in the "ARPU vs ARPPU" code block.** The original comments inside the SELECT clause described the wrong calculations: the first line was aliased `arppu` but commented as "ARPU: divide by all MAU (join with users table)", and the `sum(amount)` line was labelled "ARPU: divide by total monthly active users" even though it only computes total revenue. The comments appeared to be scrambled versions of adjacent ideas and would confuse readers. Updated the comments so they correctly describe the `arppu` computation (revenue ÷ paying users from transactions) and clarify that true ARPU requires dividing by MAU from a separate users/events source.

No other technical issues were found. All SQL syntax, function names, type declarations, engine definitions, and date arithmetic are correct per current ClickHouse documentation.

## Review Notes
- `today() - 90` works because Date arithmetic with an integer subtracts days; this is a documented ClickHouse shorthand. For clarity some teams prefer `today() - INTERVAL 90 DAY`, but the post's form is not incorrect.
- The "ARPU by Plan or Segment" query references `created_at` unqualified; it's unambiguous here because only `transactions` has that column, but qualifying as `t.created_at` would be marginally clearer. Not a technical error.
- The "Cumulative ARPU Over User Lifetime" section labels its output as `avg_ltv` and `avg_daily_arpu`; the `greatest(active_days, 1)` guard correctly avoids division by zero when a user's first and last transaction fall on the same day.
- The post's ARPPU query yields paying-user ARPU only because a users/events table is not assumed; this is intentionally called out in the updated comments and summary.
