# Validation Summary: How to Build Real-Time Anomaly Detection Pipelines with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, Materialized Views)
- ClickHouse Kafka table engine
- ClickHouse aggregate function combinators (`-State` / `-Merge`)
- Z-score / standard deviation based anomaly detection
- Apache Kafka (as a streaming source)

## Sources Consulted
- ClickHouse Kafka Table Engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse Aggregate Function Combinators documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse Aggregate Functions Reference (`varSamp`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/
- ClickHouse Date/Time Functions (`toYYYYMMDD`, `toStartOfHour`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse Nullable Functions (`nullIf`): https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls

## Issues Found
1. **Kafka engine table missing column definitions**: The `CREATE TABLE metrics_kafka` statement had no column definitions. ClickHouse's Kafka table engine requires explicit column definitions so it knows how to deserialize incoming messages. Added the four columns (`host String`, `metric_name String`, `value Float64`, `ts DateTime`) to match the target `metrics` table schema.

## Review Notes
- The use of SELECT aliases in the WHERE clause (e.g., `z_score > 3`) is a documented ClickHouse-specific extension and works correctly, though it is non-standard SQL and would not be portable to other databases.
- The `varSampState` / `varSampMerge` combinator pattern for maintaining rolling variance in an AggregatingMergeTree is idiomatic and correct.
- The z-score anomaly detection approach (flagging values > 3 standard deviations from the mean) is a well-established statistical method and is correctly implemented here.
- The `nullIf(b.stddev, 0)` guard against division by zero is the correct ClickHouse idiom.
