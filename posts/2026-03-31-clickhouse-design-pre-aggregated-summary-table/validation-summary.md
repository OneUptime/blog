# Validation Summary: How to Design a Pre-Aggregated Summary Table in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SummingMergeTree engine
- AggregatingMergeTree engine
- Materialized Views
- AggregateFunction column type and `-State` / `-Merge` combinators
- ClickHouse aggregate functions: `count`, `countIf`, `avg`, `quantile`, `uniq`, `sum`, `max`
- ClickHouse time functions: `toDate`, `toStartOfHour`, `today`, `now`

## Sources Consulted
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Materialized View documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse AggregateFunction data type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found
1. **Incorrect SummingMergeTree engine parameter syntax.** The post had `ENGINE = SummingMergeTree(total_revenue, order_count, error_count)`. According to the official ClickHouse documentation, the `columns` parameter must be passed as a tuple (parenthesized list), not as multiple separate engine arguments. Fixed to `ENGINE = SummingMergeTree((total_revenue, order_count, error_count))`.

## Review Notes
- The AggregatingMergeTree example correctly uses `-State` combinators in the materialized view and `-Merge` combinators in queries. Parameterized aggregates (e.g., `quantile(0.95)` / `quantileMerge(0.95)(...)`) are used correctly.
- The `AggregateFunction(count)` and `AggregateFunction(countIf, UInt8)` type declarations are valid — `countIf` takes a UInt8 (boolean) argument.
- The Multi-Level Rollups section is elliptical (target tables aren't fully defined). In practice, when chaining AggregatingMergeTree tables through a materialized view, you'd typically use `-MergeState` combinators (or re-apply `-State` on merged values) so that the intermediate table stores states rather than final values. The example as shown would only be valid if the target `metrics_1h` is a non-aggregating engine — worth clarifying in a future revision but not strictly incorrect given the elided context.
- Decimal64 is valid in the SummingMergeTree summed columns list; numeric types (including Decimal) are summable.
