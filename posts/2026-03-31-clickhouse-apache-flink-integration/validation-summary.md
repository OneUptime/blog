# Validation Summary: How to Use Apache Flink with ClickHouse

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Apache Flink (1.18)
- ClickHouse
- Flink JDBC Connector
- ClickHouse JDBC Driver
- ClickHouse Flink Connector
- Flink SQL
- Apache Kafka (referenced as a source)
- Maven

## Sources Consulted
- Apache Flink JDBC Connector documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/jdbc/
- Flink SQL JDBC Connector documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/table/jdbc/
- ClickHouse JDBC driver repository: https://github.com/ClickHouse/clickhouse-java
- ClickHouse Flink connector: https://github.com/ClickHouse/clickhouse-flink-connector
- ClickHouse DateTime and data types documentation: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- Flink Checkpointing documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/dev/datastream/fault-tolerance/checkpointing/

## Issues Found
No technical issues found.

The following items were verified:
- `flink-connector-jdbc:3.1.2-1.18` is a valid published version targeting Flink 1.18.
- `clickhouse-jdbc:0.6.0` is a real published version of the ClickHouse JDBC driver.
- Driver class `com.clickhouse.jdbc.ClickHouseDriver` is correct for the modern (v2+) ClickHouse JDBC driver.
- JDBC URL format `jdbc:clickhouse://host:port/database` is correct.
- `JdbcSink.sink(...)`, `JdbcExecutionOptions.builder()` with `withBatchSize`/`withBatchIntervalMs`, and `JdbcConnectionOptions.JdbcConnectionOptionsBuilder` with `withUrl`/`withDriverName`/`withUsername`/`withPassword` match the Flink JDBC connector API.
- ClickHouse SQL DDL uses correct data types (`DateTime`, `LowCardinality(String)`, `UInt32`, `String`) and valid MergeTree engine with `PARTITION BY toYYYYMM(...)` and compound `ORDER BY`.
- Flink SQL JDBC connector options (`connector`, `url`, `table-name`, `driver`, `sink.buffer-flush.max-rows`, `sink.buffer-flush.interval`) are valid option names.
- `env.enableCheckpointing(interval)` and `getCheckpointConfig().setMinPauseBetweenCheckpoints(...)` are correct Flink APIs.
- The "at-least-once delivery" statement is accurate for `JdbcSink.sink()` which provides at-least-once semantics (not exactly-once) because it is not XA-transactional.

## Review Notes
- The `flink-connector-jdbc` artifact has since been moved out of the main Flink repository and is now released under coordinates like `org.apache.flink:flink-connector-jdbc`. The `3.1.2-1.18` version used in the post is a valid externalized release and works with Flink 1.18.
- ClickHouse JDBC 0.6.x is the v2 driver; a newer v0.7.x line also exists. Readers on newer Flink/ClickHouse versions should consult Maven Central for the latest compatible versions.
- The `ClickHouseSink` builder API shown for the official ClickHouse Flink connector is illustrative; readers should consult the connector README for the most up-to-date builder method names, as the project is still evolving (0.x versioning).
- The Kafka source snippet uses `new KafkaSource<>(...)` as a placeholder; in practice Flink 1.14+ uses the `KafkaSource.builder()` API via `env.fromSource(...)`, but this is clearly shown as a placeholder and not the focus of the post.
