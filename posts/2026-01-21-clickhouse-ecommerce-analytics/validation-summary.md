# Validation Summary: How to Use ClickHouse for E-Commerce Analytics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL
- MergeTree, ReplacingMergeTree, and AggregatingMergeTree engines
- ClickHouse dictionaries
- ClickHouse data skipping indexes
- ClickHouse aggregate functions and window functions
- E-commerce analytics patterns
- Mermaid architecture diagrams

## Sources Consulted
- ClickHouse CREATE DICTIONARY documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse dictionary source documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/clickhouse
- ClickHouse flat dictionary layout documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/flat
- ClickHouse data skipping index examples: https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse windowFunnel documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions#windowfunnel
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse window functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse Decimal data type documentation: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse count aggregate documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count

## Issues Found
- The product dictionary used `LAYOUT(FLAT())` with a `UInt32` key. ClickHouse documents the flat dictionary key type as `UInt64`, so `product_id` was changed to `UInt64` consistently across the event, product, order-item, dictionary, and inventory schemas.
- The Bloom filter skip index was written without an explicit parameter list. Updated it to `bloom_filter(0.01)`, matching the documented data skipping index syntax and example form.
- The first funnel query grouped by `user_id, session_id` but labeled the output as `users`. Renamed the output alias to `sessions` so the metric matches the grouping.
- The abandoned-cart value query averaged `total_price` from individual `add_to_cart` events, which measured item-add value rather than cart value. Reworked it to sum cart value per abandoned session before averaging by hour.
- The co-purchase confidence query used a correlated aggregate subquery against the outer `p1` alias. Rewrote it with product-order and pair-count CTEs, then joined the results to calculate confidence.
- The user-based recommendation query read aggregate states from an `AggregatingMergeTree` materialized view without grouping by `user_id` before using `groupArrayMerge` in the similar-user subquery. Added `GROUP BY user_id` and moved the aggregate predicate to `HAVING`, matching ClickHouse aggregate-state read patterns.
- The low-stock query calculated current stock using only inbound movements and adjustments, ignoring sales and transfers out. Updated it to use the same signed movement logic shown in the current inventory query.
- The low-stock query used `count() / 30` for average daily sales, which counted purchase rows rather than item quantities. Changed it to `sum(quantity) / 30` and added a guard against division by zero.

## Review Notes
The examples remain illustrative and would still need adaptation for a production deployment, especially around deduplication, event idempotency, late-arriving events, currency normalization, and exact cart-state modeling. No deprecated ClickHouse APIs were found in the reviewed examples.
