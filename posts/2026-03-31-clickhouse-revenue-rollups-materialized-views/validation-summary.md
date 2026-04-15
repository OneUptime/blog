# Validation Summary: How to Build Revenue Roll-Ups with Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree engines)
- ClickHouse Materialized Views (TO table pattern)
- ClickHouse SQL (aggregate functions: countIf, sumIf, uniqExact; date functions: toDate, toYYYYMM, toStartOfMonth, today)
- ClickHouse LowCardinality and Decimal column types

## Sources Consulted
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse Materialized Views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse date functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found

### 1. `unique_customers` column incompatible with SummingMergeTree
**What was wrong:** The `revenue_daily` target table included a `unique_customers UInt64` column populated by `uniqExact(customer_id)` in the materialized view. SummingMergeTree sums all numeric columns not in the ORDER BY key during background merges. Summing distinct counts is semantically incorrect -- if two insert blocks each contribute 3 unique customers with overlap, the merged result would show 6 instead of the true unique count. The column was also not used in any of the subsequent example queries.

**What was changed:** Removed `unique_customers UInt64` from the `revenue_daily` table definition and removed `uniqExact(customer_id) AS unique_customers` from the materialized view SELECT. If unique customer counts are needed, the correct approach is to use AggregatingMergeTree with `AggregateFunction(uniqExact, UInt64)` column type and `uniqExactState`/`uniqExactMerge` functions.

**Why:** SummingMergeTree can only correctly aggregate additive metrics (sums, counts). Cardinality estimates like unique counts require AggregatingMergeTree with state/merge function pairs.

### 2. Overlapping date ranges in Week-Over-Week query
**What was wrong:** The `this_week` CTE used `revenue_date >= today() - 7` and the `last_week` CTE used `revenue_date BETWEEN today() - 14 AND today() - 7`. Since `BETWEEN` is inclusive on both ends, the date `today() - 7` was included in both CTEs, causing that day's revenue to be double-counted.

**What was changed:** Changed the `last_week` upper bound from `today() - 7` to `today() - 8`, making the ranges non-overlapping: this_week covers days 0-7 ago, last_week covers days 8-14 ago.

**Why:** Double-counting a day in both periods would skew the week-over-week growth percentage.

## Review Notes
- The post correctly uses the `TO table` pattern for materialized views, which is the recommended approach for production use in ClickHouse.
- All ClickHouse SQL syntax (CREATE TABLE, CREATE MATERIALIZED VIEW, CTEs, aggregate functions, date functions) is correct and current.
- The use of `nullIf(..., 0)` for safe division is a correct ClickHouse pattern.
- The `Decimal` types are appropriate for financial data.
- The `LowCardinality(String)` usage for dimension columns is a best practice for low-cardinality string columns.
- The "Monthly Recurring Revenue Trend" section title is slightly misleading -- the query computes total monthly revenue and average order value, not MRR in the SaaS subscription sense. This is a naming choice rather than a technical error, so it was not changed.
