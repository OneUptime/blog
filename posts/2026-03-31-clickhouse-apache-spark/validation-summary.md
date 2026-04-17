# Validation Summary: How to Connect ClickHouse with Apache Spark

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse
- Apache Spark (PySpark and Scala)
- spark-clickhouse-connector (official connector)
- clickhouse-jdbc (JDBC driver)
- Maven / Gradle / spark-submit dependency management
- Parquet on S3 / HDFS (ETL source)

## Sources Consulted
- [ClickHouse Spark Connector docs](https://clickhouse.com/docs/integrations/apache-spark/spark-native-connector)
- [ClickHouse Apache Spark overview](https://clickhouse.com/docs/integrations/apache-spark)
- [spark-clickhouse-connector GitHub repository](https://github.com/ClickHouse/spark-clickhouse-connector)
- [spark-clickhouse-connector SQL configurations](https://github.com/ClickHouse/spark-clickhouse-connector/blob/main/docs/configurations/02_sql_configurations.md)
- [Maven Central: com.clickhouse.spark:clickhouse-spark-runtime-3.4_2.12:0.8.0](https://mvnrepository.com/artifact/com.clickhouse.spark/clickhouse-spark-runtime-3.4_2.12/0.8.0)
- [ClickHouse JDBC driver docs](https://clickhouse.com/docs/integrations/language-clients/java/jdbc)

## Issues Found
1. **Outdated catalog class name.** The post configured `spark.sql.catalog.clickhouse` with `xenon.clickhouse.ClickHouseCatalog`. In spark-clickhouse-connector 0.8.0 (the version pinned in the post's dependencies) the project moved to the `com.clickhouse.spark` namespace and the catalog class was renamed to `com.clickhouse.spark.ClickHouseCatalog`. The old `xenon.clickhouse.*` class no longer exists in 0.8.0 artifacts, so the snippet would fail with `ClassNotFoundException` as written. Updated the catalog class accordingly.

2. **Incorrect write option names.** The post used snake_case option names without the `spark.` prefix: `clickhouse.write.batch_size`, `clickhouse.write.max_retry`, `clickhouse.write.retry_interval`. The connector's documented configuration keys are camelCase with a `spark.clickhouse.write.` prefix: `spark.clickhouse.write.batchSize`, `spark.clickhouse.write.maxRetry`, `spark.clickhouse.write.retryInterval`. Updated both affected code blocks (ETL pipeline and "Tune Write Performance").

3. **Wrong unit for `retryInterval`.** The post passed `"5000"` with a comment "ms between retries". The connector parses `retryInterval` as a duration string (default `"10s"`), not milliseconds. Changed the value to `"5s"` and updated the explanatory prose below the block.

4. **Invalid Python syntax in "Tune Write Performance" block.** The block placed inline `#` comments after `\` line-continuation characters (e.g. `"1000000")   \  # rows per HTTP request`). A backslash line-continuation must be the last non-whitespace token on the line, so these comments produce a `SyntaxError`. Removed the inline comments and moved the same explanation into the paragraph below the block.

## Review Notes
- The `jdbc:ch://` URL prefix used in the JDBC examples is valid — the ClickHouse JDBC driver accepts both `jdbc:ch://` and `jdbc:clickhouse://`.
- The JDBC driver class `com.clickhouse.jdbc.ClickHouseDriver` is correct for the current `com.clickhouse:clickhouse-jdbc` driver.
- The `clickhouse-spark-runtime-3.4_2.12` artifact bundles transitive client dependencies, so the extra `com.clickhouse:clickhouse-http-client:0.6.5` dependency is not strictly required for most users but does not cause harm; left as-is.
- The spark-clickhouse-connector has since released versions beyond 0.8.0 (e.g. 0.10.x adding Spark 3.5/4.0 support). The pinned `0.8.0` with Spark 3.4 / Scala 2.12 is valid but readers on newer Spark versions will want a matching runtime artifact.
- The "default JDBC fetch size is 0" caveat is a well-known Spark JDBC source quirk (Spark passes `0` meaning "driver default", and many drivers then buffer the full result set); the wording is slightly loose but directionally correct.
