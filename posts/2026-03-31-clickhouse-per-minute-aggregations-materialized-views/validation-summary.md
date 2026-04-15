# Validation Summary: How to Build Per-Minute Aggregations with Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree engines)
- Materialized Views (with TO clause)
- AggregateFunction and SimpleAggregateFunction column types
- Time-series aggregation functions (toStartOfMinute, toStartOfHour, quantileState/quantileMerge)

## Sources Consulted
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregateFunction type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse SimpleAggregateFunction type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse Materialized Views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse quantileState/quantileMerge documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-state

## Issues Found

### Issue 1: `max_duration_ms` column type incorrect for SummingMergeTree
- **What was wrong:** The `max_duration_ms` column in `http_requests_per_minute` was declared as `UInt32`. SummingMergeTree sums all numeric columns not in the sorting key during background merges. This means `max_duration_ms` values from different inserts for the same (minute, service, endpoint) key would be summed together, producing an incorrect result (e.g., max values of 500 and 300 would become 800 instead of the correct 500).
- **What was changed:** Changed the column type from `UInt32` to `SimpleAggregateFunction(max, UInt32)`. SummingMergeTree correctly handles SimpleAggregateFunction columns by applying the specified aggregate function (max) during merges instead of summing. The MV's `max(duration_ms)` expression is compatible with this column type.
- **Why:** This ensures the maximum duration is correctly maintained across background merges.

### Issue 2: Incorrect terminology in "Handling Late Data" section
- **What was wrong:** The text referred to "deduplication capabilities" of SummingMergeTree. Deduplication is a feature of ReplacingMergeTree, not SummingMergeTree. SummingMergeTree merges rows by summing numeric columns and applying aggregate functions for AggregateFunction/SimpleAggregateFunction columns. The SQL comment also said "Force re-aggregation" which was misleading — OPTIMIZE TABLE FINAL forces the merge process, not re-aggregation.
- **What was changed:** Reworded to accurately describe SummingMergeTree's merging behavior: rows with the same sorting key are combined during background merges. Updated the SQL comment to describe what OPTIMIZE TABLE FINAL actually does (forces merge so SummingMergeTree combines matching keys).
- **Why:** Using correct terminology prevents readers from confusing SummingMergeTree behavior with ReplacingMergeTree deduplication.

## Review Notes
- The post correctly notes that SummingMergeTree handles AggregateFunction columns by merging them the same way AggregatingMergeTree would — this is documented ClickHouse behavior and a useful pattern.
- The MV chaining pattern (per-minute -> hourly) is valid in ClickHouse. Inserts into the per-minute target table trigger the hourly MV correctly.
- The query example correctly uses `sum()` to re-aggregate across endpoints and `quantileMerge()` to finalize the AggregateFunction state — both are necessary because SummingMergeTree merges are not guaranteed to have completed for all parts when querying.
- The `nullIf(..., 0)` pattern for safe division is correct and idiomatic ClickHouse.
