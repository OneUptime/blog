# Validation Summary: How to Replace Pinot with ClickHouse for User-Facing Analytics

## Status
validated

## Post Type
Migration Guide

## Technologies Covered
- ClickHouse (MergeTree, Kafka engine, SummingMergeTree, materialized views, bloom filter indexes)
- Apache Pinot (architecture, PQL/Pinot SQL, Star-tree indexes)
- Apache Kafka (real-time ingestion pipeline)

## Sources Consulted
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse data-skipping indexes (bloom_filter): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse SQL reference (count, avg): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- Apache Pinot architecture documentation: https://docs.pinot.apache.org/basics/architecture

## Issues Found
1. **Kafka engine table missing column definitions**: The `CREATE TABLE user_events_kafka` statement had no column definitions. ClickHouse requires explicit column definitions for Kafka engine tables — it cannot infer schema from the topic. Added the full column list (`event_time`, `user_id`, `session_id`, `event_type`, `page`, `device_type`, `country`, `duration_ms`) with matching types to the Kafka table DDL.

## Review Notes
- The `SummingMergeTree` materialized view is correct, but readers should be aware that queries against it should use `sum(views)` rather than just selecting `views` directly, since background merges may not yet have collapsed all parts. This is standard SummingMergeTree usage and is not an error in the post, but could be a helpful addition in a future revision.
- The Pinot query example uses epoch milliseconds for time filtering and camelCase column naming (`eventTime`), which is a realistic representation of typical Pinot SQL. The ClickHouse equivalent correctly uses ISO date strings — a useful contrast for readers migrating queries.
- The comparison table is fair and accurate. ClickHouse's "Sparse" index entry refers to its primary key index, which is sparse by design (one entry per granule rather than per row).
