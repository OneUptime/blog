# Validation Summary: How to Migrate from Apache Druid to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Apache Druid (SQL API, node architecture, Kafka Indexing Service, TIME_FLOOR, APPROX_COUNT_DISTINCT, `__time` column)
- ClickHouse (MergeTree engine, Kafka engine, materialized views, `file()` / `s3()` table functions, `toStartOfHour`, `uniq`, `parseDateTimeBestEffort`, `LowCardinality`)
- Apache Kafka (as streaming ingestion source)
- Amazon S3 (as deep storage / data source)
- SQL

## Sources Consulted
- Apache Druid SQL API documentation (https://druid.apache.org/docs/latest/querying/sql-api/)
- Apache Druid SQL functions reference, incl. TIME_FLOOR and APPROX_COUNT_DISTINCT (https://druid.apache.org/docs/latest/querying/sql-functions/)
- Apache Druid architecture / processes documentation (https://druid.apache.org/docs/latest/design/architecture/)
- ClickHouse MergeTree engine docs (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse Kafka table engine docs (https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)
- ClickHouse `file` table function (https://clickhouse.com/docs/en/sql-reference/table-functions/file)
- ClickHouse `s3` table function (https://clickhouse.com/docs/en/sql-reference/table-functions/s3)
- ClickHouse date/time functions (`toStartOfHour`, `parseDateTimeBestEffort`) and aggregate function `uniq`

## Issues Found
No technical issues found.

## Review Notes
- Druid actually has six primary process types (Coordinator, Overlord, Broker, Router, Historical, MiddleManager/Indexer). The post's "6+ node types" phrasing is accurate but slightly loose — "6" is more precise. Not worth changing.
- `APPROX_COUNT_DISTINCT` in Druid uses HLL or Theta sketch depending on column type and configuration; the post's mapping to ClickHouse `uniq()` is a reasonable general equivalent, though strict parity may require `uniqHLL12` or pre-aggregated sketches for identical accuracy characteristics.
- The `file()` table function requires ClickHouse to have access to the file path on the server (or `user_files_path`); readers running ClickHouse in a container should ensure the CSV is mounted accordingly.
- The materialized view in Step 5 uses `SELECT *`, which assumes the Kafka JSON payload field names exactly match the `page_views` target columns. In practice, explicit column selection/casting is usually safer.
