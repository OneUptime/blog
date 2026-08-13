# Fix Slow Spark Reads of Millions of Tiny Parquet Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Parquet, Small Files, Compaction, Spark SQL, Data Lakes

Description: Diagnose Parquet small-file overhead, tune scan planning separately from storage layout, and compact through a safely published maintenance rewrite.

---

Parquet is columnar, but a directory containing millions of tiny Parquet objects can still be slow. Spark must discover paths, read file metadata, plan splits, open objects, schedule tasks, and manage output statistics. When each file contains little useful data, fixed per-file work can dominate decoding and filtering.

Two remedies are often confused. **Scan planning** changes how Spark groups existing files into tasks. **Compaction** rewrites the dataset into fewer, larger files. Planning settings can make a bad layout less painful; they do not remove objects from storage.

## Confirm That File Overhead Is the Bottleneck

Separate time before tasks start from time inside tasks. A long delay while the driver lists paths or builds the file index points toward discovery and metadata work. A stage with enormous task counts, small input per task, low executor CPU utilization, and short individual tasks points toward scheduling and file-open overhead.

Inventory the exact partition or date range, not the whole lake. On a filesystem with a safe listing command, capture file count and byte distribution outside Spark. Inside Spark, use the SQL UI to inspect the scan node, its selected partitions, and input metrics. Verify partition pruning first; reading every date because a filter cannot be pushed to the directory partition is a different problem.

You can also count source paths for a bounded slice:

```python
from pyspark.sql import functions as F

slice_df = (
    spark.read.parquet("s3://analytics/events")
    .where(F.col("event_date") == "2026-08-12")
)

source_file_count = (
    slice_df
    .select(F.input_file_name().alias("path"))
    .distinct()
    .count()
)
print(source_file_count)
```

This is itself a Spark job and may be expensive; use object-store inventory or catalog metadata when available. It answers how many files contributed rows, not why they were created.

## Tune File-Source Planning Carefully

Spark SQL exposes file-source settings in its performance guide:

- `spark.sql.files.maxPartitionBytes` limits bytes packed into a file-source partition;
- `spark.sql.files.openCostInBytes` supplies an estimated cost per open when packing multiple files;
- parallel partition discovery settings control when and how Spark lists paths in parallel;
- minimum and maximum partition-number suggestions can influence file splitting in supported releases.

For a tiny-file workload, Spark can place multiple files in one scan partition. That reduces tasks, but every file still exists and generally still has to be opened. Increasing listing parallelism may shorten discovery while adding load to the object store or filesystem. Adjust one setting on a representative partition and compare planning time, task count, input bytes, and request rates.

Do not lower the open-cost estimate simply to force more files into a task without measurement. It is Spark's packing estimate; set it to reflect the relative cost you observe, and retain enough tasks to use the cluster.

## Find the Writer That Created the Layout

Small files usually originate at a write boundary:

- a streaming query writes frequent micro-batches;
- a batch job retains far more output partitions than its reduced output needs;
- `partitionBy()` uses a high-cardinality or sparse directory column;
- many concurrent jobs append independently;
- retries and partial workflows leave fragmented output.

Fixing only the reader guarantees the problem returns. Record rows and bytes written per trigger or job, the number of output tasks, and distinct values of directory partition columns. The official writer API describes `partitionBy()` as a Hive-style filesystem layout and notes it is normally suitable for columns with limited cardinality.

For a batch writer, reduce or redistribute immediately before the write based on expected output bytes:

```python
target_partitions = 160  # Derived from measured output bytes, not a universal value.

(
    transformed
    .repartition(target_partitions, "event_date")
    .write
    .mode("append")
    .partitionBy("event_date")
    .parquet("s3://analytics/events")
)
```

This does not promise an exact file count or file size. Verify the resulting layout. `spark.sql.files.maxRecordsPerFile` can cap records per output file, which is useful for preventing files from becoming too large; it is not a direct target-byte-size setting and does not combine small tasks.

## Compact at a Controlled Maintenance Boundary

Compaction should create a replacement dataset and publish it only after validation. Do not casually read a path while overwriting that same path: source files selected by the running query can be removed or replaced underneath the scan. The safe publication mechanism depends on the table format, catalog, and storage system.

A generic file-based workflow is:

1. choose a bounded partition, such as one closed event date;
2. read and validate its current schema and row-level invariants;
3. calculate output partitions from measured uncompressed/output bytes and reader goals;
4. write compacted files to a separate staging location;
5. validate row counts, key aggregates, schema, and file distribution;
6. publish through the table/catalog's supported atomic replace or partition-swap mechanism;
7. remove old files only through the storage/table system's safe retention procedure.

The Spark portion can be simple:

```python
source = "s3://analytics/events/event_date=2026-08-12"
staging = "s3://analytics-staging/events/event_date=2026-08-12/run-0042"

day = spark.read.parquet(source)

(
    day
    .repartition(96)
    .write
    .mode("errorifexists")
    .parquet(staging)
)
```

Publishing is intentionally not shown as a rename: object stores, distributed filesystems, and transactional table formats have different atomicity and concurrency guarantees. Use the documented operation for the system that owns the table. Spark's generic Parquet writer alone does not provide a universal multi-file transaction protocol.

## Avoid Over-Compaction

One giant file is not the objective. Splittable Parquet files can support parallel reads, but too few files may constrain concurrency or make incremental rewrites expensive. Aim for a distribution appropriate to common scan sizes and available task slots. Keep directory partitions large enough to justify themselves and small enough for pruning to be useful.

For active streaming partitions, compact only data that is sufficiently closed or use a table system designed for concurrent optimization. Rewriting files still being appended can race with writers or omit late data unless the publication protocol handles concurrency.

Validate more than row count before publishing. Compare schema including nullability/metadata that consumers depend on, partition values, key aggregates, minimum/maximum event times, and a content checksum or deterministic sample. Parquet statistics and compression can change during a rewrite without changing logical rows; that is acceptable only when downstream readers support the resulting schema and codec. Retain the old generation until readers have moved safely and the owning storage system's retention rules permit cleanup.

Measure improvement across both planes:

- driver planning/listing time and metadata request rate;
- number of selected files and scan tasks;
- input bytes and records per task;
- executor CPU utilization and task duration;
- downstream query latency after compaction;
- new-file creation rate from the original writer.

The lasting fix makes compaction occasional maintenance, not a permanent race against an unchanged writer.

## Official Documentation

- [Spark SQL Performance Tuning: File Source Options](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Spark Configuration: Spark SQL File Settings](https://spark.apache.org/docs/latest/configuration.html)
- [Spark SQL Parquet Data Source](https://spark.apache.org/docs/latest/sql-data-sources-parquet.html)
- [PySpark DataFrameReader `parquet()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameReader.parquet.html)
- [PySpark DataFrameWriter `parquet()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.parquet.html)
- [PySpark DataFrameWriter `partitionBy()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.partitionBy.html)
- [PySpark DataFrame `repartition()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html)
- [Spark Web UI](https://spark.apache.org/docs/latest/web-ui.html)

## Conclusion

Tiny Parquet files impose fixed discovery, metadata, open, and scheduling costs that columnar encoding cannot erase. First verify pruning and tune how Spark packs existing files into scan tasks. Then correct the writer and compact bounded partitions through a staged, validated, safely published rewrite. Judge the result by planning time, task shape, request load, and the rate at which new tiny files appear—not by file count alone.
