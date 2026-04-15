# Validation Summary: How to Use optimize_read_in_order in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- SQL (ClickHouse dialect)
- ClickHouse settings: `optimize_read_in_order`, `optimize_aggregation_in_order`
- ClickHouse system tables: `system.settings`, `system.query_log`
- ClickHouse EXPLAIN statements (PIPELINE, PLAN)

## Sources Consulted
- ClickHouse ORDER BY clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/order-by
- ClickHouse EXPLAIN statement documentation: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse GROUP BY clause documentation (optimize_aggregation_in_order): https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse knowledgebase article on async vs optimize_read_in_order: https://clickhouse.com/docs/knowledgebase/async_vs_optimize_read_in_order
- ClickHouse blog on query optimization with pipeline examples: https://clickhouse.com/blog/clickhouse-faster-queries-with-projections-and-primary-indexes

## Issues Found

### 1. Aggregation example referenced nonexistent column `revenue`
- **What was wrong:** The aggregation example used `sum(revenue) AS total_revenue`, but the `events` table defined earlier in the post has no `revenue` column (only `event_date`, `event_time`, `user_id`, `event_type`, `payload`). This query would fail with a column-not-found error.
- **What was changed:** Replaced `sum(revenue) AS total_revenue` with `max(event_time) AS last_event_time`, which uses an existing column from the table definition.

### 2. `EXPLAIN SYNTAX` incorrectly presented as way to verify read-in-order
- **What was wrong:** The post suggested `EXPLAIN SYNTAX` as an alternative way to check if `optimize_read_in_order` is active. `EXPLAIN SYNTAX` only shows the query after AST-level syntax rewrites (e.g., converting comma joins to explicit JOINs). It does not show execution plan details or optimization decisions like read-in-order.
- **What was changed:** Replaced `EXPLAIN SYNTAX` with `EXPLAIN PLAN`, which actually shows `ReadType: InOrder` when the optimization is active. Added a clarifying sentence about what to look for in the output.

### 3. Pipeline verification description was imprecise/misleading
- **What was wrong:** The post said to "Look for `MergingSorted` in the pipeline output" as the indicator of read-in-order being active. However, `MergingSortedTransform` appears in both the read-in-order and full-sort pipelines, so its presence alone is not diagnostic. The post also mentioned `ReadInOrder` (which is from `EXPLAIN PLAN` output, not `EXPLAIN PIPELINE`) and `FinishSorting` (which indicates a partial sort key match scenario, not a standard read-in-order case).
- **What was changed:** Corrected the description to identify `MergeTreeInOrder` (vs `MergeTreeThread`) as the true indicator in `EXPLAIN PIPELINE` output, and clarified that the absence of `PartialSortingTransform` and `MergeSortingTransform` confirms the optimization is active.

## Review Notes
- The `optimize_aggregation_in_order` setting is disabled by default (value=0), unlike `optimize_read_in_order` which is enabled by default. The post does not explicitly state this, but the code example correctly shows it being explicitly enabled with `optimize_aggregation_in_order = 1`, so this is not misleading.
- The post's claim that the fourth bullet under "When the Optimization Does Not Apply" ("`LIMIT` is very large or absent and the data is spread across many disjoint parts") is slightly imprecise — the optimization still technically applies (reads are still in order), but the performance benefit is reduced. This is acceptable simplification for a tutorial.
- All SQL syntax, ClickHouse function names (`toYYYYMM`, `today()`, `formatReadableSize`), system table column names, and SETTINGS clause usage are correct.
