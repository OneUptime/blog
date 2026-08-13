# Validation Summary: Fix Slow Spark Reads of Millions of Tiny Parquet Files

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Spark 4.2.0
- Spark SQL and the Spark Web UI
- PySpark DataFrame read, write, repartitioning, and file-metadata APIs
- Apache Parquet and partition discovery
- Hadoop S3A and cloud object storage
- Data-lake small-file compaction and safe publication

## Sources Consulted

- [Spark SQL Performance Tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Spark Configuration](https://spark.apache.org/docs/latest/configuration.html)
- [Spark SQL Parquet Data Source](https://spark.apache.org/docs/latest/sql-data-sources-parquet.html)
- [Spark Cloud Integration](https://spark.apache.org/docs/latest/cloud-integration.html)
- [PySpark `DataFrameReader.parquet()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameReader.parquet.html)
- [PySpark `DataFrameWriter.parquet()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.parquet.html)
- [PySpark `DataFrameWriter.mode()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.mode.html)
- [PySpark `DataFrameWriter.partitionBy()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.partitionBy.html)
- [Spark `DataFrameWriter` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/DataFrameWriter.html)
- [PySpark `DataFrame.repartition()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html)
- [PySpark `input_file_name()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.input_file_name.html)
- [Spark Web UI](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark SQL Error Conditions](https://spark.apache.org/docs/latest/sql-error-conditions.html)
- [Spark 4.2.0 `FilePartition` source](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/datasources/FilePartition.scala)
- [Spark 4.2.0 `InMemoryFileIndex` source](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/datasources/InMemoryFileIndex.scala)
- [Apache Hadoop S3A documentation](https://hadoop.apache.org/docs/current/hadoop-aws/tools/hadoop-aws/index.html)
- [Apache Parquet format](https://github.com/apache/parquet-format/blob/master/README.md)

## Issues Found

- The examples used `s3://`, which is not the maintained Amazon S3 connector scheme in stock Apache Hadoop. Changed all example paths to `s3a://`; vendor runtimes may provide their own `s3://` implementation, but it is not portable Apache Spark guidance.
- The source-file counting example read the dataset root and filtered afterward. A raw path-based read can list the supplied root before partition pruning, so this did not reliably bound discovery to one date. Changed it to read the concrete partition path and set `basePath`, which also retains `event_date` as a discovered partition column.
- `spark.sql.files.maxPartitionBytes` was described as an unconditional limit. Current Spark can ignore that value while rescaling an excessive initial partition count toward `spark.sql.files.maxPartitionNum`. Qualified the statement accordingly.
- The batch writer called `repartition(target_partitions, "event_date")`. Spark hash-partitions by the supplied expression, so every row for one date goes to one shuffle partition; the byte-derived partition count therefore could not size files within that date. Changed the example to an unkeyed repartition for a batch already bounded to one date and documented the need for a deliberate per-date distribution strategy in multi-date jobs.
- The compaction example read raw Parquet with schema merging disabled. Spark otherwise uses a summary schema or one data file's schema, which can omit compatible evolved columns during a rewrite. Enabled `mergeSchema` in the generic raw-file example and directed production workflows to use an authoritative table schema when available.
- Reading the leaf partition path does not add the leaf's `event_date` value to the resulting DataFrame unless a higher `basePath` is supplied. Clarified that the compaction workflow must validate this value from the catalog or path.
- The original schema-validation advice implied that a raw Spark schema comparison could verify Parquet nullability. Spark converts Parquet columns to nullable on read, so it cannot by itself prove that physical required/optional annotations were preserved. Changed the guidance to compare against an authoritative schema contract and use Parquet-level inspection when those annotations matter.
- The diagnosis text implied that all path listing happens on the driver, although Spark can run parallel partition discovery as a distributed job. Reworded it to distinguish listing/file-index work from scan-task execution without assigning all listing to the driver.
- The claim that a reader-only fix guarantees recurrence was too absolute if the writer no longer runs. Qualified it to apply when the writer continues unchanged.

## Review Notes

- The current `latest` documentation resolved to Apache Spark 4.2.0 during validation. `spark.sql.files.minPartitionNum` requires Spark 3.1 or later, and `spark.sql.files.maxPartitionNum` requires Spark 3.5 or later; the post's "supported releases" qualification is correct.
- The named APIs and save mode (`errorifexists`) are current and non-deprecated. The Python snippets are syntactically valid, but they assume an existing `SparkSession`, input DataFrames, and a configured Hadoop S3A connector with credentials.
- Parquet schema merging is intentionally disabled by default because it can be expensive. Supplying the table's validated canonical schema is preferable when such a contract exists.
- The staging-and-publication guidance is appropriately system-dependent: Spark's generic Parquet writer does not supply a universal multi-file transaction, and object-store rename semantics must not be assumed atomic.
