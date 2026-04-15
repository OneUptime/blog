# Validation Summary: How to Replicate Data from PostgreSQL to ClickHouse in Real-Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MaterializedPostgreSQL database engine, Kafka table engine, ReplacingMergeTree, materialized views, JSONExtract functions)
- PostgreSQL (logical replication, WAL, replication slots, publications)
- Debezium (PostgreSQL CDC connector with pgoutput plugin)
- Apache Kafka (message broker for CDC pipeline)

## Sources Consulted
- ClickHouse documentation for MaterializedPostgreSQL database engine: https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql
- ClickHouse documentation for Kafka table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse documentation for ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse system tables documentation: https://clickhouse.com/docs/en/operations/system-tables
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- PostgreSQL logical replication documentation: https://www.postgresql.org/docs/current/logical-replication.html
- Other blog posts in this repository covering MaterializedPostgreSQL and Debezium CDC patterns for cross-reference

## Issues Found
1. **Incorrect system table name for monitoring MaterializedPostgreSQL**: The post referenced `system.materialized_postgresql_databases`, which does not exist. Changed to `system.materialized_postgresql_tables`, which is the correct system table for monitoring MaterializedPostgreSQL replication status. Verified against other posts in this repo that use the same table.

2. **Debezium delete events extract from wrong field**: The CDC materialized view extracted all fields from the `after` column for every operation type. For Debezium delete events (`op = 'd'`), the `after` field is null and the row data is in the `before` field. This would cause delete events to produce rows with zero/empty values instead of correctly marking the original row as deleted. Fixed by wrapping each `JSONExtract*` call with `if(op = 'd', before, after)` to read from the correct source field depending on the operation type.

## Review Notes
- The `JSONExtractFloat` used for `total_amount` may lose precision for high-precision decimal values. Debezium's default `decimal.handling.mode=precise` encodes decimals as base64 byte arrays, which would require different parsing. The blog's approach works when Debezium is configured with `decimal.handling.mode=double` or `decimal.handling.mode=string`. This is a common simplification in tutorials.
- The `_version` column uses `toUnixTimestamp(now())` which has second-level granularity. If multiple CDC events for the same row arrive within the same second, ReplacingMergeTree may not deterministically pick the latest one. For production use, a monotonically increasing sequence or Kafka offset would be more reliable.
- The Kafka consumer group name used in the monitoring command (`clickhouse-cdc`) does not match any `kafka_group_name` setting in the Kafka table definition. Users would need to specify `kafka_group_name` in the table settings or use the auto-generated group name for monitoring.
- The `MaterializedPostgreSQL` engine is marked as experimental in ClickHouse and requires `SET allow_experimental_database_materialized_postgresql = 1` to use. The post does not mention this prerequisite.
