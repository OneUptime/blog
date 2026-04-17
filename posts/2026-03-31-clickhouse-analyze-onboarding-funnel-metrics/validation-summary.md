# Validation Summary: How to Analyze Onboarding Funnel Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, window functions, parametric aggregates)
- Product analytics patterns (funnel analysis, cohort analysis)

## Sources Consulted
- ClickHouse docs — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — Window functions and `lagInFrame`: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse docs — Date/Time functions (`dateDiff`, `toStartOfWeek`, `toDateTime`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse docs — `quantile` parametric aggregate: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse docs — `IN` operator and tuple IN: https://clickhouse.com/docs/en/sql-reference/operators/in
- ClickHouse docs — Correlated subqueries limitations (IN / JOIN): https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
1. **"Users Stuck at Each Step" query had a correlated-subquery bug.** The original used `WHERE completed = 1 AND step = step` inside a `user_id NOT IN (...)` subquery. ClickHouse does not support correlated subqueries in this context, so `step = step` refers to the subquery's own `step` column — a tautology that is always true where step is not NULL. The effect was that the query excluded any user who ever completed *any* step (not the step being checked). Replaced with tuple `NOT IN`: `(user_id, step) NOT IN (SELECT user_id, step FROM onboarding_events WHERE completed = 1)`, which is the idiomatic ClickHouse way to express this semantic.

2. **"Time to Complete Each Step" query truncated DateTime to Date, making hour diffs always multiples of 24.** The original used `dateDiff('hour', signup_date, toDate(ts))`. Both arguments were Date type (since `toDate(ts)` drops the time component), so `dateDiff` in `'hour'` units always produced multiples of 24 — not the actual elapsed hours. Changed to `dateDiff('hour', toDateTime(signup_date), ts)` so that the DateTime `ts` is used directly, giving true hour-granularity results.

## Review Notes
- The `drop_off_pct` calculation uses `(prev_users - users) * 100.0 / (prev_users + 1)` to avoid division by zero. This slightly skews the percentage when `prev_users` is small; a cleaner idiom would be `nullIf(prev_users, 0)` or a `CASE WHEN prev_users = 0 THEN NULL ELSE ... END`. Not incorrect, just a minor stylistic note.
- The drop-off query orders steps by user count descending as a proxy for funnel order. This works when funnel counts are monotonically decreasing, but if a later step has a higher completion count than an earlier one (rare but possible with re-engagement events), ordering would misrepresent the funnel. Worth noting for future refinement but not a technical error.
- `PARTITION BY toYYYYMMDD(ts)` creates daily partitions, which can produce many parts for long-running tables. `toYYYYMM(ts)` (monthly) is more typical. Not wrong, just a design trade-off.
- `toStartOfWeek` defaults to Sunday as the start of week (mode 0). If the reader needs ISO weeks, they should pass mode 1.
