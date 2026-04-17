# Validation Summary: How to Use ClickHouse with Databricks

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse
- Databricks
- Apache Spark (PySpark)
- Delta Lake
- ClickHouse Spark Connector (`com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12`)
- ClickHouse JDBC driver
- ClickHouse `deltaLake` table function
- ClickHouse MergeTree engine

## Sources Consulted
- ClickHouse Spark native connector docs: https://clickhouse.com/docs/integrations/apache-spark/spark-native-connector
- ClickHouse Apache Spark integration overview: https://clickhouse.com/docs/en/integrations/apache-spark
- ClickHouse Databricks integration docs: https://github.com/ClickHouse/clickhouse-docs/blob/main/docs/integrations/data-ingestion/apache-spark/databricks.md
- ClickHouse `deltaLake` table function docs: https://clickhouse.com/docs/en/sql-reference/table-functions/deltalake
- spark-clickhouse-connector source (`ClickHouseTableProvider.scala`) on GitHub: https://github.com/ClickHouse/spark-clickhouse-connector
- Maven Central: `com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12` (https://central.sonatype.com/artifact/com.clickhouse.spark/clickhouse-spark-runtime-3.5_2.12)
- Maven Central: `com.clickhouse:clickhouse-jdbc` (https://central.sonatype.com/artifact/com.clickhouse/clickhouse-jdbc)

## Issues Found

1. **Incorrect option name `port` should be `http_port`.**
   The official ClickHouse Spark connector (`ClickHouseTableProvider`) uses the option key `http_port`, not `port`. Using `port` causes the connector to fall back to the default 8123 and the explicit configuration to be silently ignored. Fixed in the Read, Write, and Schedule examples. Also added an explicit `protocol` option in the read/write examples for clarity.

2. **Incorrect option name `dbtable` should be `table`.**
   The connector's `TableProvider` requires the option key `table`. Using `dbtable` (a Spark JDBC convention) raises a "Required option 'table' is missing" error. Fixed in all three PySpark examples.

3. **Schedule example was missing required options.**
   The job-scheduling write example only set `host`, `dbtable`, and `mode`. Added the missing `http_port` and `database` options so the example is runnable as written.

## Review Notes
- Maven coordinates `com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12:0.8.0` and `com.clickhouse:clickhouse-jdbc:0.6.0:all` are valid published artifacts. They are older than the current latest releases (connector 0.10.0 released Jan 2026, JDBC 0.9.8) but still work; the post does not claim to use the latest versions, so they were left unchanged.
- The official ClickHouse docs recommend the Spark Catalog approach (`spark.sql.catalog.<name>` properties) over the DataFrame `format("clickhouse")` TableProvider API. The TableProvider approach used in the post is still valid and is in fact the only option when Databricks Unity Catalog is enabled (which blocks third-party Spark catalog registration), so the post's choice is reasonable for a Databricks-focused guide.
- For ClickHouse Cloud, readers will need `protocol=https`, `http_port=8443`, and `ssl=true`. The post uses a self-hosted-style configuration on port 8123; this is fine but a Cloud-specific note could be added in the future.
- The `deltaLake('s3://...')` table function call is correct; for non-public buckets, AWS credentials would need to be supplied as additional arguments or via the named-collection / S3 credentials configuration.
- The `order_by` write option is required by the connector when it auto-creates the target table. The post pre-creates the table with `CREATE TABLE`, so this is not strictly required for the write example, though specifying it would be more robust.
