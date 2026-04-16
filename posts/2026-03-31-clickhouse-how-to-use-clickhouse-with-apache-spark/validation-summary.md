# Validation Summary: How to Use ClickHouse with Apache Spark

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse
- Apache Spark (PySpark)
- ClickHouse Spark connector (`com.clickhouse.spark:clickhouse-spark-runtime-3.4_2.12`)
- ClickHouse JDBC driver (`com.clickhouse:clickhouse-jdbc`)
- Maven / spark-submit
- Spark SQL catalog API

## Sources Consulted
- ClickHouse official Spark integration docs: https://clickhouse.com/docs/integrations/apache-spark
- Spark native connector reference: https://clickhouse.com/docs/integrations/apache-spark/spark-native-connector
- Spark JDBC integration reference: https://clickhouse.com/docs/integrations/apache-spark/spark-jdbc
- spark-clickhouse-connector GitHub repo: https://github.com/ClickHouse/spark-clickhouse-connector

## Issues Found
1. **Wrong reader/writer option name `port`.** The native connector uses `http_port`, not `port`, for the HTTP port. Fixed in the "Reading from ClickHouse" and "Writing to ClickHouse" code blocks.
2. **Unsupported `query` option for the native data source.** The native `clickhouse` data source does not accept a `query` option for arbitrary SQL. The "Reading with SQL Push-Down" example was rewritten to rely on the connector's automatic filter push-down via the DataFrame `.filter(...)` API, which is the documented mechanism.
3. **JDBC-only options used with the native format in Performance Tuning.** `numPartitions`, `partitionColumn`, `lowerBound`, and `upperBound` are standard Spark JDBC reader options and are not honored by `format("clickhouse")`. The "Performance Tuning" example was changed to use `format("jdbc")` with the ClickHouse JDBC driver so those parallelism options work as intended.

## Review Notes
- The `clickhouse-spark-runtime-3.4_2.12:0.8.0` artifact is valid (released under the current `com.clickhouse.spark` group ID with the `ClickHouseCatalog` class in `com.clickhouse.spark`). A newer release (0.10.0) is available as of 2026-01; readers targeting current setups may prefer bumping both the connector (`0.10.0`) and the JDBC driver (`0.9.x`), but the versions in the post are not incorrect.
- The catalog configuration, `com.clickhouse.spark.ClickHouseCatalog` class name, and all `spark.sql.catalog.clickhouse.*` properties (`host`, `protocol`, `http_port`, `user`, `password`, `database`) are correct.
- The ClickHouse SQL used in the catalog example (`toStartOfDay`, `count()`) is valid ClickHouse syntax.
- Connecting the Spark connector to a server exposed only via HTTPS requires additional `ssl=true` / `ssl_mode` options; this post only demonstrates the plain HTTP path.
