# Validation Summary: How to Build Solar Panel Performance Monitoring with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, materialized views, TTL)
- SQL (CTEs, CROSS JOIN, aggregate functions, state combinators)
- Solar panel IoT telemetry and performance monitoring concepts

## Sources Consulted
- ClickHouse documentation on SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation on AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on SimpleAggregateFunction: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse documentation on AggregateFunction and -State/-Merge combinators: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse documentation on MergeTree TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse SQL function reference (toYYYYMM, toDate, today, nullIf, round, count): https://clickhouse.com/docs/en/sql-reference/functions

## Issues Found

### 1. Incorrect data volume claim
- **What was wrong:** The post stated "10,000 panels reporting every minute generates over 14 billion rows per year." The actual calculation is 10,000 × 525,600 minutes/year = 5,256,000,000 (~5.26 billion), not 14 billion.
- **What was changed:** Updated "over 14 billion" to "over 5 billion."
- **Why:** The original figure overstated the data volume by nearly 3x, which undermines the credibility of the opening argument.

### 2. SummingMergeTree incorrectly used with avg() aggregate
- **What was wrong:** The `solar_string_daily` table used `SummingMergeTree()` with an `avg_pr Float32` column populated by `avg(efficiency_pct)`. SummingMergeTree sums all non-key numeric columns during background part merges. This means average values from different insert batches would be summed together, producing nonsensical results (e.g., two batches with avg_pr of 15.5 and 16.2 would produce 31.7 instead of a correct average).
- **What was changed:** Replaced `SummingMergeTree()` with `AggregatingMergeTree()`. Changed `kwh` to `SimpleAggregateFunction(sum, Float64)` (correctly summed during merges) and `avg_pr` to `AggregateFunction(avg, Float32)` (stores intermediate state). Updated the materialized view to use `avgState(efficiency_pct)` instead of `avg(efficiency_pct)`. Added a query example showing how to read from the materialized view using `avgMerge()` to finalize the average.
- **Why:** This is a well-known ClickHouse pitfall. AggregatingMergeTree with state/merge combinators is the correct pattern when a materialized view needs to maintain averages (or other non-additive aggregates) across incremental inserts.

## Review Notes
- The Performance Ratio calculation and Daily Energy Production queries sum instantaneous power readings (watts) and label the results as energy (Wh/kWh). Strictly speaking, summing power readings only yields energy if multiplied by the time interval between readings. The post implicitly assumes a 1-minute granularity but does not account for the time factor. This is a common simplification in monitoring tutorials and does not affect the ClickHouse SQL correctness, but readers building production systems should be aware of the distinction.
- The `* 1` factor in the theoretical_wh calculation (`irradiance_wm2 * 0.001 * 1`) appears to be a placeholder for rated panel capacity in kWp. This is noted but not changed since it is presented as a simplified model.
- All ClickHouse SQL syntax (MergeTree DDL, PARTITION BY, ORDER BY, TTL, toYYYYMM, toDate, today(), nullIf, round, count(), WITH/CTE, CROSS JOIN) was verified as correct and current.
