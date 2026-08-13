# Validation Summary: Size Spark Partitions from Input Bytes, Cores, and AQE

## Status
validated

## Post Type
Technical performance-tuning guide

## Technologies Covered
- Apache Spark
- Spark SQL file-source and shuffle partitioning
- Adaptive Query Execution (AQE)
- PySpark runtime configuration and DataFrame APIs
- Spark RDD partitioning
- Spark dynamic resource allocation
- Spark Web UI, event logs, and task metrics
- Spark SQL partitioning hints and output-file sizing

## Sources Consulted
- Apache Spark SQL Performance Tuning: https://spark.apache.org/docs/4.2.0/sql-performance-tuning.html
- Apache Spark Configuration: https://spark.apache.org/docs/4.2.0/configuration.html
- Apache Spark Tuning Guide: https://spark.apache.org/docs/4.2.0/tuning.html
- Apache Spark RDD Programming Guide: https://spark.apache.org/docs/4.2.0/rdd-programming-guide.html
- Apache Spark Job Scheduling: https://spark.apache.org/docs/4.2.0/job-scheduling.html
- Apache Spark Web UI: https://spark.apache.org/docs/4.2.0/web-ui.html
- Apache Spark Monitoring and Instrumentation: https://spark.apache.org/docs/4.2.0/monitoring.html
- PySpark `RuntimeConfig`: https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.conf.RuntimeConfig.html
- PySpark DataFrame `explain()`: https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html
- PySpark DataFrame `coalesce()`: https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.coalesce.html
- PySpark DataFrame `repartition()`: https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html
- Apache Spark SQL partitioning hints: https://spark.apache.org/docs/4.2.0/sql-ref-syntax-qry-select-hints.html
- Apache Spark `AQEShuffleReadExec` source: https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/adaptive/AQEShuffleReadExec.scala

## Issues Found
- The post called a partition a scheduling unit, although Spark schedules tasks and normally runs one task per partition in a stage. Reworded this as a unit of parallel work and made the task-to-partition relationship explicit.
- The post treated `spark.sql.shuffle.partitions` as the unconditional initial AQE shuffle count. Clarified that `spark.sql.adaptive.coalescePartitions.initialPartitionNum`, when explicitly set, takes precedence for AQE coalescing; otherwise Spark falls back to `spark.sql.shuffle.partitions`.
- The AQE example set `spark.sql.adaptive.advisoryPartitionSizeInBytes` without changing `spark.sql.adaptive.coalescePartitions.parallelismFirst` from its current default of `true`, under which Spark ignores the advisory target during coalescing. Added `parallelismFirst=false` so the example actually coalesces toward the configured advisory size.
- The post said the example numbers were not defaults, although 64 MiB is the current default advisory partition size. Corrected the wording and documented that the example deliberately changes `parallelismFirst` from its default.
- A bare `AQEShuffleRead` does not prove that AQE coalesced partitions because it can also identify local or skewed reads. Changed the verification instruction to require the `coalesced` or `coalesced and skewed` marker.
- The post used Spark's term “execution memory” for a broader set that included decoded rows and user code. Changed this to “working memory” because Spark defines execution memory more narrowly for computation such as shuffles, joins, sorts, and aggregations.
- The Stage UI checklist included executor CPU time, which Spark collects as a task metric but does not list as a current Stage UI summary metric. Replaced it with scheduler delay, which the Stage UI exposes.

## Review Notes
- The review used the current Apache Spark 4.2.0 documentation. The post's `/docs/latest/` links currently resolve to the intended official pages, but defaults and UI details can vary by Spark release.
- `peak execution memory` is a narrower Spark metric for internal execution structures and should not be interpreted as total per-task or executor memory usage.
- The PySpark configuration snippet is syntactically valid and uses current, non-deprecated runtime configuration keys.
