# Validation Summary: How to Build Factory Floor Monitoring with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, LowCardinality, Nullable types, aggregate and window functions)
- SQL (DDL, aggregations, window functions)
- Manufacturing / MES concepts (shift production, downtime, cycle time, takt / attainment)

## Sources Consulted
- ClickHouse Data Types — LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse Data Types — Nullable: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `leadInFrame`: https://clickhouse.com/docs/en/sql-reference/window-functions/leadinframe
- ClickHouse `argMax`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse date/time functions (`dateDiff`, `toYYYYMMDD`, `today`, `toHour`, `toDate`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse conditional functions (`multiIf`, `nullIf`): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse aggregate functions (`stddevPop`, `avg`, `sum`, `count`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference

## Issues Found
1. **Invalid type nesting `Nullable(LowCardinality(String))`** — ClickHouse requires `LowCardinality` to wrap `Nullable`, not the other way around. Changed `fault_code Nullable(LowCardinality(String))` to `fault_code LowCardinality(Nullable(String))`, which is the canonical and documented form.
2. **Broken Downtime Analysis query** — The original query had three problems:
   - Used `lead()` which is not a supported ClickHouse window function (ClickHouse provides `leadInFrame` / `lagInFrame`).
   - Nested a window function inside an aggregate function (`sum(dateDiff(..., lead(...) OVER (...)))`) at the same query level, which ClickHouse does not allow.
   - Relied on the implicit window frame, which defaults to `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — so a forward-looking function would not see subsequent rows.

   Rewrote the query to compute the per-row gap in a subquery using `leadInFrame(event_at) OVER (... ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING)`, then aggregate in the outer query. The downtime-event filter was moved to the outer query so gaps are still measured against the true next event regardless of its type.

## Review Notes
- Partitioning by `toYYYYMMDD(event_at)` creates daily partitions, which is very granular and may lead to many parts for high-retention tables; `toYYYYMM` is more commonly recommended for MergeTree partitioning. Left as-is since it is not incorrect and suits short-retention or per-day query patterns.
- The shift classification in "Shift Production Count" labels hours 0–7 as "Night", 8–15 as "Day", and 16–23 as "Evening". This is a plausible but non-standard labeling (many plants place "Night" as the shift that spans midnight). Treating it as an illustrative example is fine.
- The "Line Throughput vs. Target" query hard-codes `960` planned parts (2 parts/min × 480 min). This is a reasonable illustration, and the inline comment makes the assumption explicit.
