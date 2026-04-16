# Validation Summary: How to Handle Schema Drift in ClickHouse Ingestion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, Kafka engine)
- ClickHouse data types: `Map(String, String)`, `JSON`, `Nullable`
- ClickHouse DDL: `CREATE TABLE`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- ClickHouse JSON functions: `JSONExtractString`, `JSONExtractUInt`
- `JSONEachRow` input format
- Kafka table engine integration
- Schema registry (conceptual)

## Sources Consulted
- ClickHouse JSON data type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/newjson
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse Map data type documentation
- ClickHouse ALTER TABLE documentation
- ClickHouse JSON extraction functions documentation

## Issues Found
- **Strategy 2 (JSON Data Type) was outdated.** The post originally described the JSON type as "Experimental", referenced the deprecated `Object('json')` type, and used `SET allow_experimental_object_type = 1`. As of ClickHouse 25.3 (March 2025), the new `JSON` type is production-ready and no experimental setting is required. Updated the section heading to remove "(Experimental)", removed the stale reference to `Object('json')`, and removed the `SET allow_experimental_object_type = 1` line. Added a note that `JSON` has been production-ready since 25.3.

## Review Notes
- `Map(String, String)` with `MergeTree` ordering on `(event_type, timestamp)` is valid and a common pattern.
- The `JSONEachRow` insert examples are syntactically valid.
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` syntax is correct and idempotent.
- The Kafka engine settings (`kafka_broker_list`, `kafka_topic_list`, `kafka_group_name`, `kafka_format`) are all valid and required per the ClickHouse documentation.
- `JSONExtractString`, `JSONExtractUInt`, and `yesterday()` are all valid ClickHouse functions.
- The `clickhouse-client --query "..."` shell example is correct syntactically; note that `$new_col` would be shell-interpolated in the bash context.
- The Kafka section is described as "schema registry integration" but the SQL example only shows the Kafka engine itself; true schema registry integration (e.g., Confluent Schema Registry with Avro) would require additional settings like `format_avro_schema_registry_url`. This is conceptually fine at the level the post describes, but could be expanded in a future revision.
