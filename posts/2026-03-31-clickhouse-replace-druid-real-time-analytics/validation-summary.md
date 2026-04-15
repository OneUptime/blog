# Validation Summary: How to Replace Druid with ClickHouse for Real-Time Analytics

## Status
validated

## Post Type
Migration Guide

## Technologies Covered
- ClickHouse (SummingMergeTree, Kafka engine, JSONExtract functions, OPTIMIZE TABLE)
- Apache Druid (Broker, Coordinator, Historical, MiddleManager, Overlord, Kafka Indexing Service)
- Apache Kafka (as ingestion source)
- Apache ZooKeeper / ClickHouse Keeper (for coordination)

## Sources Consulted
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse JSONAsString format documentation: https://clickhouse.com/docs/en/interfaces/formats#jsonasstring
- ClickHouse JSON function reference (JSONExtractFloat, JSONExtractString, JSONExtractUInt): https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- Apache Druid architecture documentation: https://druid.apache.org/docs/latest/design/architecture
- Apache Druid ingestion spec reference: https://druid.apache.org/docs/latest/ingestion/ingestion-spec
- Druid SQL TIME_FLOOR function reference: https://druid.apache.org/docs/latest/querying/sql-scalar#date-and-time-functions

## Issues Found

### Issue 1: Kafka engine table missing column definition
**What was wrong:** The `events_kafka_src` table was defined with no columns, but the materialized view referenced a `raw` column using JSONExtract functions. ClickHouse requires column definitions for Kafka engine tables.

**What was changed:** Added `(raw String)` column definition to the CREATE TABLE statement.

### Issue 2: Wrong Kafka format for raw JSON approach
**What was wrong:** The Kafka table used `kafka_format = 'JSONEachRow'`, which expects columns matching JSON field names and auto-maps them. Since the table uses a single `raw` column with JSONExtract parsing in the materialized view, the correct format is `JSONAsString`, which reads each JSON message as a single raw string.

**What was changed:** Changed `kafka_format` from `'JSONEachRow'` to `'JSONAsString'`.

### Issue 3: JSONExtractString used for a numeric JSON field
**What was wrong:** `toFloat64(JSONExtractString(raw, 'revenue'))` was used to extract the revenue field. `JSONExtractString` only extracts JSON string values (quoted values). If `revenue` is a JSON number (e.g., `19.99` rather than `"19.99"`), `JSONExtractString` returns an empty string, and `toFloat64('')` returns `0` — silently losing data.

**What was changed:** Replaced `toFloat64(JSONExtractString(raw, 'revenue'))` with `JSONExtractFloat(raw, 'revenue')`, which correctly extracts numeric values from JSON.

## Review Notes
- The Druid architecture description (Broker, Coordinator, Historical, MiddleManager, Overlord, ZooKeeper dependency) is accurate.
- The architecture comparison table is reasonable and accurate for both systems.
- The Druid datasource schema JSON is a valid simplified representation of a Druid ingestion spec with correct field names and metric types (`count`, `doubleSum`).
- The SummingMergeTree engine choice is appropriate: columns in the ORDER BY key (`__time`, `user_id`, `event_type`, `country`) serve as the grouping key, and the remaining numeric columns (`count`, `revenue`) are automatically summed during background merges — matching the Druid pre-aggregation behavior.
- The Druid SQL `TIME_FLOOR(__time, 'PT1H')` to ClickHouse `toStartOfHour(__time)` translation is correct.
- `OPTIMIZE TABLE events FINAL` is valid ClickHouse syntax for forcing part merges.
- The metadata comparison noting Druid uses Derby/PostgreSQL while ClickHouse uses system tables is accurate (Druid supports Derby for embedded mode and PostgreSQL/MySQL for production metadata storage).
