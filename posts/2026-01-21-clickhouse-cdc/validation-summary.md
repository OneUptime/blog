# Validation Summary: How to Implement CDC (Change Data Capture) with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ReplacingMergeTree
- VersionedCollapsingMergeTree
- Kafka table engine
- Debezium PostgreSQL connector
- Debezium ExtractNewRecordState SMT
- PostgreSQL table engine
- Materialized views

## Sources Consulted
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse system.kafka_consumers documentation: https://clickhouse.com/docs/operations/system-tables/kafka_consumers
- ClickHouse PostgreSQL table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/postgresql
- ClickHouse VersionedCollapsingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/versionedcollapsingmergetree
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium event flattening SMT documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html

## Issues Found
- Replaced `ReplacingMergeTree(_version)` with `ReplacingMergeTree(_version, _deleted)` in CDC examples that use a delete marker, matching ClickHouse's current `is_deleted` parameter support.
- Updated the Debezium PostgreSQL connector configuration from deprecated `database.server.name` to current `topic.prefix`.
- Updated the Debezium unwrap delete option from `transforms.unwrap.delete.handling.mode` to current `transforms.unwrap.delete.tombstone.handling.mode`.
- Renamed "Direct PostgreSQL CDC" to "Direct PostgreSQL Incremental Sync" because the PostgreSQL table engine query pattern shown is timestamp-based batch sync, not WAL-based CDC.
- Added the required explicit schema to the `PostgreSQL` table-engine example.
- Corrected the sync-state comment from "dictionary" to "table".
- Removed the misleading `merge_with_ttl_timeout` setting from the CDC table tuning example and corrected comments for `parts_to_throw_insert` and `index_granularity`.
- Corrected the `system.kafka_consumers` query to use documented columns and removed nonexistent `broker_id` and `lag` columns.
- Adjusted wording around Kafka monitoring from lag-only monitoring to offsets, freshness, and data quality.

## Review Notes
ClickHouse was not installed in the local environment, so SQL snippets were reviewed against official documentation rather than executed locally. The Kafka Engine and Debezium snippets may still require deployment-specific settings such as converters, schemas, authentication, topic creation policy, and Kafka broker security settings.
