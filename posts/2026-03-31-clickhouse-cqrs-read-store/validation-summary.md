# Validation Summary: How to Implement CQRS with ClickHouse as the Read Store

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- ClickHouse (ReplacingMergeTree, SummingMergeTree, Kafka engine, Materialized Views, FINAL modifier)
- PostgreSQL (as the write store)
- Kafka (as the change-data-capture transport)
- Debezium (for PostgreSQL CDC)
- CQRS architectural pattern

## Sources Consulted
- ClickHouse ReplacingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse SummingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse Kafka engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse Materialized Views docs: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse FINAL modifier docs: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- Debezium PostgreSQL connector docs: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- ClickHouse data types (UUID, Decimal, LowCardinality, UInt*): https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found
- **SummingMergeTree ORDER BY was incorrect.** The original `daily_revenue_mv` defined `ORDER BY (toDate(created_at))` but grouped by both `day` and `status`. In SummingMergeTree, the ORDER BY clause is the merge key — rows sharing the same key have their numeric columns summed on merge. With only `toDate(created_at)` in the ORDER BY, rows for different statuses on the same day would be merged into a single row with arbitrary `status` values and combined sums, producing incorrect aggregates. Changed the ORDER BY to `(day, status)` so all dimension columns are part of the merge key and the table correctly holds one row per (day, status) pair. This also makes the ORDER BY reference the MV's output columns, which is the idiomatic form for inline-engine materialized views.

## Review Notes
- The `ReplacingMergeTree(updated_at)` definition, `PARTITION BY toYYYYMM(created_at)`, and `ORDER BY (customer_id, order_id)` are all correct.
- The Kafka engine settings (`kafka_broker_list`, `kafka_topic_list`, `kafka_group_name`, `kafka_format = 'JSONEachRow'`) are current and valid.
- Using `FINAL` is accurate for getting the latest version from `ReplacingMergeTree`; readers should be aware it adds query-time overhead and that `SELECT ... FINAL` semantics for deduplication rely on proper `version` column handling.
- The post mentions "A materialized view transforms and routes the payload into `order_read_model`" but does not show that MV's DDL. Not a correctness issue, but readers implementing this end-to-end will need to build that transformation MV themselves (parsing the Debezium envelope with JSONExtract functions).
- Using `HAVING total_orders > 5` with a SELECT alias is supported in ClickHouse.
- Consider noting that `ReplacingMergeTree` deduplication is eventual (happens at merge time) — even with `FINAL`, concurrent inserts may briefly show duplicates depending on the query path. Not incorrect in the post, just a caveat worth flagging to readers.
