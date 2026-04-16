# Validation Summary: How to Migrate from MongoDB to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB (mongoexport, aggregation pipeline, Extended JSON)
- ClickHouse (MergeTree engine, LowCardinality, JSONEachRow, clickhouse-client)
- jq (JSON transformation)
- Debezium (MongoDB connector for CDC)
- Apache Kafka (via ClickHouse Kafka engine)

## Sources Consulted
- MongoDB mongoexport documentation: https://www.mongodb.com/docs/database-tools/mongoexport/
- MongoDB Extended JSON (v2) specification: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data formats (JSONEachRow): https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow
- ClickHouse SQL functions reference (count, uniq, toDate, toYYYYMM): https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse Kafka engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- Debezium MongoDB connector: https://debezium.io/documentation/reference/stable/connectors/mongodb.html
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
No technical issues found.

## Review Notes
- The jq extraction pattern `.created_at."$date"` works correctly with mongoexport's default "relaxed" Extended JSON v2 output (default since MongoDB 4.2), where dates appear as `{"$date": "<ISO-8601 string>"}`. If a user is on an older version or has canonical mode enabled, dates would instead appear as `{"$date": {"$numberLong": "..."}}` and the jq would need adjustment (e.g., `.created_at."$date"."$numberLong"` and a conversion from epoch milliseconds). A brief note on this edge case could help readers on older MongoDB versions.
- The ClickHouse `DateTime` type has a range limited to 1970-01-01 through 2106-02-07. For use cases requiring sub-second precision or years beyond this range, `DateTime64` would be more appropriate, but `DateTime` is a reasonable default for typical analytics.
- The `ORDER BY (created_at, user_id, event_type)` choice places the time column first, which is a common pattern for time-series workloads but can yield slower queries when filtering by `event_type` without a time filter. Putting `event_type` (LowCardinality) earlier could improve some query patterns — this is a tuning consideration, not an error.
- Step 6 on Debezium is correct but very brief; wiring up the Kafka engine in ClickHouse to consume Debezium's CDC topic format (with its `before`/`after` envelope) typically requires a materialized view and some unwrapping logic. The high-level pointer is accurate.
