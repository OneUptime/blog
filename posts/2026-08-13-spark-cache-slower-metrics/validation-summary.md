# Validation Summary: Diagnose When Spark Caching Makes a Job Slower

## Status

validated

## Post Type

Technical performance-tuning guide

## Technologies Covered

- Apache Spark
- PySpark DataFrame and RDD APIs
- Spark SQL in-memory columnar caching
- Spark persistence and storage levels
- Spark unified memory management and dynamic allocation
- Spark Web UI, event logs, and task metrics
- Python

## Sources Consulted

- [Apache Spark SQL Performance Tuning: Caching Data](https://spark.apache.org/docs/latest/sql-performance-tuning.html#caching-data)
- [Apache Spark Tuning Guide: Memory Management](https://spark.apache.org/docs/latest/tuning.html#memory-management-overview)
- [Apache Spark RDD Programming Guide: Persistence](https://spark.apache.org/docs/latest/rdd-programming-guide.html#rdd-persistence)
- [PySpark DataFrame `cache()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.cache.html)
- [PySpark DataFrame `persist()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.persist.html)
- [PySpark DataFrame `unpersist()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.unpersist.html)
- [PySpark DataFrame `storageLevel`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.storageLevel.html)
- [PySpark RDD `persist()`](https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.RDD.persist.html)
- [PySpark DataFrame `checkpoint()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.checkpoint.html)
- [PySpark DataFrame `localCheckpoint()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.localCheckpoint.html)
- [Apache Spark Web UI](https://spark.apache.org/docs/latest/web-ui.html)
- [Apache Spark Monitoring and Instrumentation](https://spark.apache.org/docs/latest/monitoring.html)
- [Apache Spark Configuration: Spark UI and Dynamic Allocation](https://spark.apache.org/docs/latest/configuration.html)
- [Apache Spark Job Scheduling: Dynamic Resource Allocation](https://spark.apache.org/docs/latest/job-scheduling.html#dynamic-resource-allocation)
- [Apache Spark SQL Literals](https://spark.apache.org/docs/latest/sql-ref-literals.html#datetime-literal)
- [PySpark DataFrame `join()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html)

## Issues Found

- The physical-plan guidance incorrectly listed evicted or lost partitions as a reason for a cache hit to revert to the original scan and exchanges. The post now explains that a cache hit remains an `InMemoryTableScan` over an `InMemoryRelation`, that the original child plan may still be displayed without executing, and that missing blocks are recomputed through lineage.
- The dynamic-allocation guidance did not explain that Spark's cached-executor idle timeout defaults to infinity. The affected bullets now apply specifically when removal of cache-holding executors is configured and their cached blocks are not preserved or migrated.
- The metrics list implied that ordinary event logs directly attribute cache disk I/O and CPU spent decoding cached data. It now calls for live Storage-tab and host I/O evidence where needed, compares executor CPU at the stage level, and notes that per-block event logging is disabled by default and can substantially enlarge event logs.
- The checkpoint comparison could be read as applying to unreliable local checkpoints. It now explicitly describes reliable checkpointing and its configured checkpoint directory.
- The cache batch-size statement claimed improved throughput, while the official setting documentation specifically promises potential improvements to memory utilization and compression. The wording now matches the documented effects.

## Review Notes

The PySpark example was executed successfully with representative schemas on Apache Spark 4.2.0. The date literal, projections, equi-join, persistence, materializing `count()`, `InMemoryTableScan`, storage-level inspection, and blocking `unpersist()` behavior were verified. All documentation links in the post returned successfully.

The post correctly avoids assuming identical persistence defaults: current PySpark DataFrames default to `MEMORY_AND_DISK_DESER`, while PySpark RDDs default to `MEMORY_ONLY` and store Python objects serialized. `peakExecutionMemory` is a useful comparison metric but is not total executor memory; for SQL it covers supported unsafe operators and `ExternalSort`.
