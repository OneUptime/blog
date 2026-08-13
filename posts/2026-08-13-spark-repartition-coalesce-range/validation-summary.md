# Validation Summary: Choose `repartition()`, `coalesce()`, or `repartitionByRange()` in Spark

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Apache Spark
- PySpark DataFrames
- Spark SQL physical planning and Adaptive Query Execution (AQE)
- Hash, narrow, and range partitioning
- Spark shuffle behavior and performance tuning
- Parquet and filesystem-style output partitioning

## Sources Consulted

- [PySpark `DataFrame.repartition()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html)
- [PySpark `DataFrame.coalesce()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.coalesce.html)
- [PySpark `DataFrame.repartitionByRange()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartitionByRange.html)
- [PySpark `DataFrame.sortWithinPartitions()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.sortWithinPartitions.html)
- [PySpark `DataFrameWriter.partitionBy()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.partitionBy.html) and [Scala `DataFrameWriter` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/DataFrameWriter.html)
- [Spark configuration reference](https://spark.apache.org/docs/latest/configuration.html), including `spark.sql.files.maxRecordsPerFile`
- [Spark SQL performance tuning and AQE](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Spark SQL partitioning hints](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-hints.html#partitioning-hints)
- [Spark RDD programming guide: shuffle operations](https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations)
- [PySpark `DataFrame.explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html) and [Spark Web UI](https://spark.apache.org/docs/latest/web-ui.html)
- [PySpark `RDD.getNumPartitions()`](https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.RDD.getNumPartitions.html)
- [PySpark `spark_partition_id()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.spark_partition_id.html) and [Spark `TaskContext` API](https://spark.apache.org/docs/latest/api/java/org/apache/spark/TaskContext.html)
- [Spark `RangePartitioner` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/RangePartitioner.html)
- [Spark Connect overview](https://spark.apache.org/docs/latest/spark-connect-overview.html)
- [Apache Spark `FileFormatDataWriter` source](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/datasources/FileFormatDataWriter.scala)

## Issues Found

- `coalesce(n)` was described as always returning exactly `n` partitions. When `n` is greater than the current count, Spark leaves the count unchanged. The post now qualifies the result and confines the narrow-dependency explanation to partition reduction.
- The drastic-coalesce discussion referred to a “balanced single final partition,” even though balance among partitions is not meaningful when only one remains. It now states the actual benefit of `repartition(1)`: retaining upstream parallelism before the shuffled single-partition stage.
- The partitioned-write example said multiple Spark partitions could contain one date after `repartition(200, "event_date")`. That contradicts the example's hash distribution, which sends equal date values to the same Spark partition unless a later shuffle intervenes. The explanation now identifies append writes and `spark.sql.files.maxRecordsPerFile` as valid reasons the destination can still contain multiple files per date.
- The post said any subsequent shuffle invalidates both partition-local ordering and grouping. It now distinguishes the guarantees: a shuffle does not preserve existing local order, while repartitioning on incompatible keys invalidates grouping.
- The partition count returned by `getNumPartitions()` was later called a “declared” count. It is an observed RDD partition count, so the wording was corrected.
- Task retries were listed as a cause of changed Spark partition IDs. A retry has a new task-attempt identity but computes the same RDD partition ID. That cause was removed; changes in upstream partitioning, AQE, or input splits remain valid reasons IDs can change.

## Review Notes

The review used the current Apache Spark 4.2.0 documentation. All Python examples are syntactically valid, and the featured DataFrame APIs are current and non-deprecated. `candidate.rdd.getNumPartitions()` applies to classic PySpark; Spark Connect does not support RDD APIs. Range partitioning uses sampling and can exceptionally create fewer partitions than requested when too few records are sampled. AQE coalesces eligible post-shuffle partitions but does not imply that every explicit fixed-count `repartition(n, ...)` exchange will be coalesced.
