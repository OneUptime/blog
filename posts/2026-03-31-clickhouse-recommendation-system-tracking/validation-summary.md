# Validation Summary: How to Build a Recommendation System Tracking Platform with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, materialized views, LowCardinality, DateTime64, UUID, Decimal types)
- SQL (JOINs, CTEs, aggregate functions, window-based self-joins)
- Recommendation system analytics (CTR, A/B testing, collaborative filtering, position bias, engagement funnels)

## Sources Consulted
- ClickHouse documentation on MergeTree engine family: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation on AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on aggregate function combinators (-State, -Merge, -If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation on data types (UUID, DateTime64, Decimal, LowCardinality, Nullable): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation on materialized views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view

## Issues Found

### 1. Ambiguous column reference in A/B Test query
- **What was wrong:** The `experiment_id` column in the SELECT, GROUP BY, and ORDER BY clauses was unqualified, but it exists in both `recommendation_impressions` and `recommendation_interactions` tables. In a JOIN query, this can cause an `AMBIGUOUS_COLUMN_NAME` error depending on the ClickHouse version and settings.
- **What was changed:** Qualified all references to `i.experiment_id` (using the impressions table alias).
- **Why:** Explicit table qualification prevents ambiguity errors and makes the query's intent clear.

### 2. Materialized view using SummingMergeTree with count(DISTINCT)
- **What was wrong:** The materialized view used `SummingMergeTree()` engine with `count(DISTINCT i.impression_id)` for the `impressions` column. `SummingMergeTree` sums numeric columns during background part merges. While `countIf()` and `sum()` are additive and work correctly with `SummingMergeTree`, `count(DISTINCT)` values are not reliably additive — summing distinct counts from different parts can produce inflated numbers if the same key appears across multiple inserted batches.
- **What was changed:** Changed the engine to `AggregatingMergeTree()` and replaced all aggregate functions with their `-State` combinator equivalents: `uniqState()` for impressions, `sumIfState()` for conditional counts, and `sumState()` for revenue. This stores intermediate aggregate states that can be correctly merged during part merges.
- **Why:** `AggregatingMergeTree` with `-State`/`-Merge` combinators is the canonical ClickHouse pattern for materialized views that need non-additive aggregations like distinct counts. It correctly handles data arriving across multiple INSERT batches.

## Review Notes
- The materialized view now uses `AggregatingMergeTree` with `-State` combinators. Readers should be aware that querying this view requires `-Merge` functions (e.g., `uniqMerge(impressions)`, `sumIfMerge(clicks)`, `sumMerge(revenue_usd)`) rather than plain `SELECT column_name`.
- The materialized view uses a LEFT JOIN between impressions and interactions. Since ClickHouse materialized views only trigger on inserts to the source table in the FROM clause (`recommendation_impressions`), interactions that arrive after the corresponding impressions will not be captured by the MV. This is an inherent architectural limitation of JOIN-based materialized views, not a syntax error.
- The item co-occurrence self-join query produces both (A,B) and (B,A) pairs. This is not incorrect but doubles the result set. Adding `AND e1.item_id < e2.item_id` to the ON clause would deduplicate pairs if only symmetric co-occurrence is needed.
- All schema definitions use appropriate ClickHouse types: `LowCardinality(String)` for low-cardinality dimensions, `DateTime64(3)` for millisecond timestamps, `UUID` with `generateUUIDv4()` defaults, and `Nullable(Decimal(12, 4))` for optional monetary values.
- All other SQL queries (CTR, position bias, model coverage, engagement funnel, top items CTE, user-level performance) are syntactically correct and use valid ClickHouse functions and operators.
