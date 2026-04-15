# Validation Summary: How to Track CI/CD Pipeline Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, aggregate functions, -If combinators)
- SQL (CREATE TABLE, SELECT with GROUP BY, HAVING, ORDER BY, LIMIT, subqueries, self-joins)
- CI/CD concepts (pipeline runs, stages, DORA metrics, MTTR)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE / MergeTree engine (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse documentation: LowCardinality type (https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality)
- ClickHouse documentation: quantile aggregate function (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile)
- ClickHouse documentation: countIf / -If combinator (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if)
- ClickHouse documentation: stddevPop aggregate function (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/stddevpop)
- ClickHouse documentation: dateDiff function (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff)
- ClickHouse documentation: Window functions (https://clickhouse.com/docs/en/sql-reference/window-functions)
- ClickHouse documentation: toYYYYMM, toDate, now() functions (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)

## Issues Found
1. **MTTR query produced incorrect results (always 0)**
   - **What was wrong:** The original MTTR query used `min(ts_start) OVER (PARTITION BY repo ORDER BY ts_start ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING)` to find the "recovery" timestamp. Because the window is ordered by `ts_start` ascending and the frame starts at the current row, `min(ts_start)` always returns the current row's own `ts_start`. This means `recover_ts = fail_ts` for every row, so `dateDiff('minute', fail_ts, recover_ts)` always returns 0. Additionally, the window function did not filter for successful runs — it computed the minimum over all rows regardless of status, so even if the min calculation worked differently, it would not necessarily find the next *successful* run.
   - **What was changed:** Replaced the window function approach with a self-join that correctly pairs each failed run with the earliest subsequent successful run in the same repo. The new query joins `pipeline_runs AS f` (failures) with `pipeline_runs AS s` (successes where `s.ts_start > f.ts_start`), groups by each failure to find the minimum recovery time, then averages per repo.
   - **Why:** The self-join approach correctly implements MTTR semantics: for each failure, find the time to the next success in the same repo, then average those durations.

## Review Notes
- The schema, percentile, failure rate, throughput, and flaky stages queries are all syntactically correct and use idiomatic ClickHouse functions.
- The `HAVING avg_s > 60` clause in the flaky stages query uses a column alias, which ClickHouse supports (unlike some other SQL databases).
- The MTTR self-join could be expensive on very large datasets since it pairs each failure with all subsequent successes before taking the minimum. For production use at scale, consider materializing intermediate results or using ClickHouse's ASOF JOIN for more efficient time-series matching.
- The post covers four DORA-adjacent metrics (build duration, failure rate, throughput, MTTR) but does not cover Change Lead Time or Deployment Frequency as separate DORA metrics — this is fine for scope but worth noting for a future follow-up.
