# Validation Summary: How to Fix 'Worker Node' Failures in Spark

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Apache Spark
- PySpark
- Spark SQL
- Spark Standalone
- Spark on YARN
- Spark cluster monitoring and REST APIs
- Linux shell scripting
- OneUptime alerting

## Sources Consulted
- Apache Spark Configuration documentation: https://spark.apache.org/docs/latest/configuration.html
- Apache Spark Running on YARN documentation: https://spark.apache.org/docs/latest/running-on-yarn.html
- Apache Spark Standalone Mode documentation: https://spark.apache.org/docs/latest/spark-standalone.html
- Apache Spark Monitoring and Instrumentation documentation: https://spark.apache.org/docs/latest/monitoring.html
- Apache Spark SQL Performance Tuning documentation: https://spark.apache.org/docs/latest/sql-performance-tuning.html
- PySpark StorageLevel API documentation: https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.StorageLevel.html
- PySpark DataFrameReader.parquet API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameReader.parquet.html
- OneUptime API documentation: https://oneuptime.com/docs/en/api-reference/api-reference

## Issues Found
- Replaced `StorageLevel.MEMORY_AND_DISK_SER` with `StorageLevel.MEMORY_AND_DISK` because current PySpark exposes `MEMORY_AND_DISK` and related constants, but not `MEMORY_AND_DISK_SER`.
- Changed the Parquet read partition-size example from `.option("maxPartitionBytes", "128m")` to `spark.conf.set("spark.sql.files.maxPartitionBytes", "128m")`, matching the documented Spark SQL file-source configuration.
- Removed `spark.yarn.executor.memoryOverhead` from the `spark-submit` example because the current documented key is `spark.executor.memoryOverhead`, which is supported on YARN and Kubernetes.
- Removed `spark.storage.blockManagerSlaveTimeoutMs` from the heartbeat timeout example because current Spark timeout guidance uses `spark.network.timeout` and related timeout properties instead of that legacy key.
- Replaced deprecated `spark.blacklist.*` configuration keys with the current `spark.excludeOnFailure.*` keys.
- Updated the best-practice wording from "Enable blacklisting" to "Enable exclude-on-failure" to match the current Spark terminology.
- Fixed the skew-salting code so `explode()` is used in `withColumn()` directly rather than nested inside `when()`, which Spark SQL does not allow.

## Review Notes
The article remains broadly correct as a practical troubleshooting guide. Some examples are cluster-manager specific: `spark.worker.cleanup.*` applies to Spark Standalone workers, while YARN and Kubernetes handle worker/container cleanup differently. The OneUptime alert submission code is illustrative and would need real authentication and a production-specific endpoint or integration configuration before use.
