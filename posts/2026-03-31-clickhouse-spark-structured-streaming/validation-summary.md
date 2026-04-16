# Validation Summary: How to Use ClickHouse with Apache Spark Structured Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Spark 3.5.0 (Structured Streaming)
- ClickHouse (ReplacingMergeTree engine)
- ClickHouse Spark Connector (clickhouse-spark-runtime 0.8.0)
- ClickHouse JDBC Driver 0.6.3
- Apache Kafka (as a streaming source)
- PySpark (DataFrame API, windowed aggregations)
- Maven (dependency management)

## Sources Consulted
- ClickHouse Spark Connector GitHub repository: https://github.com/ClickHouse/spark-clickhouse-connector
- Maven Central for `com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12` artifact verification
- Apache Spark 3.5.0 Structured Streaming documentation: https://spark.apache.org/docs/3.5.0/structured-streaming-programming-guide.html
- Apache Spark 3.5.0 spark-submit documentation: https://spark.apache.org/docs/3.5.0/submitting-applications.html
- Apache Spark Configuration docs (spark.streaming.* vs spark.sql.streaming.* namespaces)
- ClickHouse JDBC driver documentation: https://github.com/ClickHouse/clickhouse-java
- ClickHouse SQL reference for CREATE TABLE, ReplacingMergeTree, and query syntax

## Issues Found

1. **Incorrect option names in native connector `.format("clickhouse")` write** — The code used `clickhouse.host`, `clickhouse.port`, `clickhouse.database`, `clickhouse.user`, `clickhouse.password`, and `clickhouse.write.batchSize` as `.option()` keys. The `clickhouse.` prefix is used for Spark catalog configuration (`spark.sql.catalog.<name>.host`), not for the DataSource format API. The correct option names for `.format("clickhouse")` are `host`, `http_port`, `database`, `user`, and `password`. Fixed the option names accordingly.

2. **Unused `import jaydebeapi`** — The JDBC section imported `jaydebeapi` (a Python JDBC bridge library) but never used it. The actual JDBC writing uses Spark's built-in `.format("jdbc")` DataSource, which does not require `jaydebeapi`. Removed the unused import.

3. **`--num-executors` used with Spark standalone mode** — The spark-submit command used `--master spark://spark-master:7077` (Spark standalone) with `--num-executors 4`, but `--num-executors` is a YARN-specific option that is silently ignored in standalone mode. Changed to `--total-executor-cores 8` (equivalent to 4 executors x 2 cores), which is the correct standalone mode option.

4. **`spark.streaming.stopGracefullyOnShutdown` is for legacy DStreams, not Structured Streaming** — This configuration property belongs to the `spark.streaming.*` namespace which applies to the old DStream-based Spark Streaming API. It has no effect on Structured Streaming, which uses the `spark.sql.streaming.*` namespace. Graceful shutdown for Structured Streaming is handled programmatically via `query.stop()`. Removed the incorrect config from the spark-submit command.

## Review Notes
- The Maven artifact `com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12:0.8.0` is valid on Maven Central. Version 0.8.1 is also available as a newer release.
- The `batch_df.isEmpty()` call is valid for Spark 3.5.0 (added in Spark 3.3.0).
- The JDBC URL format `jdbc:ch://localhost:8123/default` is correct for the ClickHouse JDBC driver 0.6.3.
- The `outputMode("update")` with `foreachBatch` and aggregations is a valid combination in Structured Streaming.
- The checkpoint location in spark-submit (`/shared/checkpoints`) differs from the one in the Python code (`/tmp/spark-checkpoints/ch-sink`). The code-level setting takes precedence, so this is not an error, but could be confusing to readers.
