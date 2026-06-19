# Validation Summary: How to Fix 'Data Skew' Issues in Spark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Spark
- Spark SQL
- PySpark DataFrame API
- Adaptive Query Execution (AQE)
- Broadcast joins
- Data partitioning and repartitioning

## Sources Consulted
- Apache Spark SQL Performance Tuning documentation: https://spark.apache.org/docs/latest/sql-performance-tuning.html
- Apache Spark Configuration documentation: https://spark.apache.org/docs/latest/configuration.html
- PySpark functions API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/functions.html
- PySpark `monotonically_increasing_id` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.monotonically_increasing_id.html
- PySpark `DataFrame.repartition` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html
- PySpark `DataFrame.union` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.union.html

## Issues Found
- The broadcast join section used `SizeEstimator.estimate(lookup_df._jdf)` as if it measured the size of the table data. This estimates a JVM object, not a reliable DataFrame data size for broadcast planning. Replaced it with `lookup_df.explain(mode="cost")`, which shows optimized-plan statistics Spark can use.
- The broadcast join explanation said broadcasting eliminates shuffle entirely. Tightened the wording to say it can avoid the large shuffle required by a regular shuffle join, which matches Spark's broadcast join behavior more accurately.
- The AQE section implied Spark automatically handles all skewed shuffle partitions. Adjusted the wording to skewed shuffle partitions in joins and changed "will" to "can", matching Spark's documented skew join optimization behavior and prerequisites.
- The isolated skewed keys example used `broadcast()` but did not import it in the snippet. Added the missing import and removed unused imports.
- The custom partitioning example used `spark_sum()` and `count()` without importing them in that snippet. Added the missing imports.
- The NULL-handling example used `concat()` and `lit()` without importing them. Added the missing imports.
- The NULL replacement expression mixed the original join-key type with a string fallback. Cast the original key to string before `coalesce()` so the expression is type-safe for non-string join keys.
- The NULL-handling cross join example could be misread as preserving normal SQL join semantics. Added a short comment clarifying that SQL equality joins do not match `NULL` to `NULL`, so this approach should only be used when that business logic is intended.
- The salting text said the salt was a prefix, while the code appends it as a suffix. Updated the text and clarified that aggregation after removing salt is only needed for operations that require it.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Some examples still use illustrative thresholds and internal-style inspection patterns appropriate for a tutorial, but production use should validate join plans and partition metrics against the actual Spark version, table statistics, and data distribution.
