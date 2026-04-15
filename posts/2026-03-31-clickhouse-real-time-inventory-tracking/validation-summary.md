# Validation Summary: How to Build Real-Time Inventory Tracking with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, Materialized Views, Window Functions, Kafka Engine, HTTP Interface)
- Apache Kafka (as a streaming data source)
- SQL (DDL, DML, window functions, aggregations)
- curl (HTTP client for alerting integration)

## Sources Consulted
- ClickHouse MergeTree Engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse Materialized Views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse Kafka Engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse HTTP Interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse LowCardinality type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality

## Issues Found
1. **Kafka engine table missing column definitions**: The `CREATE TABLE inventory_kafka` statement had no column definitions. ClickHouse's Kafka engine requires explicit column definitions — the schema cannot be inferred from the format alone. Without columns, the DDL statement would fail with a syntax error. Added the five required columns (`warehouse_id UInt32`, `sku String`, `qty_delta Int32`, `reason String`, `ts DateTime`) to match the fields selected by the downstream materialized view.

## Review Notes
- The `curl` command uses a literal `<` character in the URL, which is technically an unsafe character per RFC 1738 and should be percent-encoded as `%3C`. In practice, curl handles this correctly when the URL is quoted, and ClickHouse's HTTP interface parses it fine, so this is not a functional issue.
- The SummingMergeTree query correctly uses `sum(stock_on_hand)` rather than reading `stock_on_hand` directly, which is the correct pattern since background part merges are asynchronous and may not have collapsed all rows yet.
- The window function syntax (`ROWS UNBOUNDED PRECEDING`) is valid shorthand supported by ClickHouse since v21.1.
