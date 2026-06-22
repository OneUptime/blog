# Validation Summary: How to Fix 'Out of Memory' Spark Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Spark
- PySpark
- Spark SQL
- Spark configuration
- Spark UI and metrics
- YARN and Kubernetes container memory behavior

## Sources Consulted
- Apache Spark Configuration documentation: https://spark.apache.org/docs/latest/configuration.html
- Apache Spark SQL Performance Tuning documentation: https://spark.apache.org/docs/latest/sql-performance-tuning.html
- Apache Spark Monitoring and Instrumentation documentation: https://spark.apache.org/docs/latest/monitoring.html
- PySpark `collect_list` API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.collect_list.html
- PySpark `slice` API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.slice.html
- PySpark `sortWithinPartitions` API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.sortWithinPartitions.html
- PySpark `saveAsTable` API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.saveAsTable.html

## Issues Found
- Added missing `SparkSession` imports to snippets that construct a session, so those examples are syntactically complete.
- Corrected the memory fraction guidance. The original text set Spark's default values while saying this configured spilling behavior. The revised text explains that these are defaults and that lowering `spark.memory.fraction` can increase spills and eviction, while lowering `spark.memory.storageFraction` reduces the portion of cached data immune to eviction.
- Added the missing `col` import to the salting example. The function used `col(skewed_key_col)` but did not import `col` from `pyspark.sql.functions`.
- Replaced the fixed broadcast-join guidance of "df2 < 1GB" with Spark's documented behavior: automatic broadcast joins default to a 10MB threshold unless configured, while explicit broadcast hints should only be used for tables small enough to fit on each executor.
- Softened the bucketing claim. The original text said bucketed tables do not shuffle on join, but Spark can only reduce or avoid shuffle when bucket layouts and join requirements are compatible.
- Added a missing `collect_list` import in the GroupBy scenario snippet and renamed "streaming aggregation" to sort-based fallback guidance, which matches the configuration shown.

## Review Notes
- The post remains a practical troubleshooting guide rather than a version-specific reference. Spark defaults cited here were checked against the current Apache Spark documentation available on 2026-06-19.
- Some tuning values, such as target partition sizes and broadcast suitability, are workload-dependent rules of thumb rather than hard limits.
