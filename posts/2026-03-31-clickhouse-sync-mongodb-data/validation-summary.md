# Validation Summary: How to Sync MongoDB Data to ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Change Streams, mongoexport)
- ClickHouse (ReplacingMergeTree, Kafka engine, JSONEachRow format)
- Python (pymongo, clickhouse-driver)
- Debezium MongoDB Connector (CDC via Kafka Connect)
- Apache Kafka

## Sources Consulted
- clickhouse-driver Python library source code (RowOrientedBlock.normalize / _pure_mutate_dicts_to_rows) for dict INSERT behavior
- Debezium MongoDB Connector documentation: https://debezium.io/documentation/reference/stable/connectors/mongodb.html
- Debezium 2.0 release notes (deprecated properties): https://debezium.io/blog/2022/10/17/debezium-2-0-final-released/
- Confluent Debezium MongoDB Source Connector config reference: https://docs.confluent.io/kafka-connectors/debezium-mongodb-source/current/mongodb_source_connector_config.html
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree

## Issues Found

### Issue 1: Delete handling in Change Streams consumer causes KeyError (Bug)
**What was wrong:** The delete branch of the Change Streams consumer (Option 1) only included `id` and `_deleted` keys in the dict appended to the buffer. The clickhouse-driver library determines columns from the server's table schema and performs direct key access (`row[name]`) on each dict — there is no `.get()` fallback. When a delete dict missing `user_id`, `status`, `total`, and `created_at` is encountered, the driver raises a `KeyError` at runtime.

**What was changed:** Added all required fields with sentinel/default values to the delete branch: `user_id: ''`, `status: ''`, `total: 0`, `created_at: datetime(1970, 1, 1)`. Also added `from datetime import datetime` to the imports.

**Why:** Every dict in the insert buffer must have the same set of keys matching the full table schema for clickhouse-driver to process the batch correctly.

### Issue 2: Debezium MongoDB connector uses removed configuration properties (Outdated)
**What was wrong:** The Debezium connector config used `mongodb.hosts` and `mongodb.name`, which were deprecated in Debezium 2.0 (October 2022) and fully removed in Debezium 2.4 (October 2023).

**What was changed:** Replaced `mongodb.hosts: "rs0/mongo-host:27017"` with `mongodb.connection.string: "mongodb://mongo-host:27017/?replicaSet=rs0"`, and replaced `mongodb.name: "myapp"` with `topic.prefix: "myapp"`.

**Why:** These are the correct property names for Debezium 2.x+, which is the current major version. The old properties would cause connector startup failures on any modern Debezium deployment.

## Review Notes
- The `mongoexport` example (Option 3) outputs Extended Relaxed JSON v2. For simple field types this works with ClickHouse's `JSONEachRow`, but MongoDB's `_id` field serializes as `{"$oid": "..."}` rather than a plain string, which would not map to the `id String` column without transformation. This is acceptable for a high-level example but users should be aware that a transformation step (e.g., `jq`) may be needed in practice.
- The `--type json` flag on `mongoexport` is redundant (JSON is the default output format) but not incorrect.
- The post correctly recommends `ReplacingMergeTree` for handling MongoDB updates and mentions querying with `FINAL` for accurate results, which is good practice advice.
- The `json` import in Option 1 is unused but harmless.
