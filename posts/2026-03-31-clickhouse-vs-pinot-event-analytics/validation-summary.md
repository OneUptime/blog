# Validation Summary: ClickHouse vs Pinot for Event Analytics

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- ClickHouse (MergeTree engine, Kafka engine, data skipping indexes, LowCardinality types)
- Apache Pinot (real-time tables, index configuration, architecture components)
- Apache Kafka (streaming ingestion)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE, MergeTree engine, Kafka engine, data skipping indexes, aggregate function combinators (countIf), date functions (toYYYYMM, today())
- Apache Pinot documentation: table index configuration (tableIndexConfig), bloom filter configuration (bloomFilterConfigs), sorted column config, real-time table type, architecture components (Controller, Broker, Server, Minion, ZooKeeper)

## Issues Found

1. **Pinot `bloomFilterColumns` does not exist**: The original config used `"bloomFilterColumns": ["session_id"]`, which is not a valid Pinot configuration field. Bloom filters are configured via `bloomFilterConfigs` with per-column configuration objects including parameters like `fpp`. Fixed to use the correct `bloomFilterConfigs` map format.

2. **Pinot `sortedColumn` should be a string, not an array**: The original config used `"sortedColumn": ["occurred_at"]` (an array). In Pinot, `sortedColumn` takes a single string value since only one column can be the sorted column per segment. Fixed to `"sortedColumn": "occurred_at"`.

3. **Minion listed as a required Pinot component**: The original text stated Pinot "requires a Controller, Broker, Server, and Minion service." Minion is optional -- it handles auxiliary tasks like segment merging and purging but is not required for a functioning cluster. Fixed to list Minion as optional.

## Review Notes
- All ClickHouse SQL snippets are syntactically correct and use idiomatic patterns.
- The post uses "skip indexes" as shorthand for ClickHouse's official "data skipping indexes" terminology. This is widely understood and acceptable in a blog context.
- The funnel analysis query shown is a simplified example. ClickHouse also offers dedicated `windowFunnel` and `retention` functions for more sophisticated funnel/retention analysis, but the simpler `countIf` approach shown is valid and easier to understand.
