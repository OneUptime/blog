# Validation Summary: How to Build Supply Chain Visibility Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, aggregate functions, window functions)
- SQL (DDL, analytical queries, window functions)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE / MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: argMax aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse documentation: dateDiff function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation: quantile parametric aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse documentation: countIf aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if
- ClickHouse documentation: countDistinct (alias for uniqExact) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/countdistinct
- ClickHouse documentation: Window functions (lead/lag) — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: LowCardinality type — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation: Nullable type — https://clickhouse.com/docs/en/sql-reference/data-types/nullable

## Issues Found
No technical issues found.

## Review Notes
- `countDistinct(order_id)` in the Geographic Shipment Distribution query is valid but less idiomatic than `uniqExact(order_id)` in the ClickHouse ecosystem. Both produce identical results; `countDistinct` is an official alias for `uniqExact`.
- `Nullable(Float32)` for latitude/longitude provides approximately 7 significant digits (~1 meter precision at the equator), which is adequate for supply chain analytics. `Float64` would offer higher precision if needed.
- The "On-Time Delivery Rate" section title is slightly misleading — the query measures delivery completion rate (percentage of carrier events that are 'delivered'), not on-time delivery against a promised date. The inline SQL comment acknowledges this limitation.
- The `lead()` window function in the Bottleneck Detection query returns NULL for the last event per order, which causes `dateDiff` to return NULL. These rows are correctly filtered out by the `WHERE hours_in_stage > 0` clause.
