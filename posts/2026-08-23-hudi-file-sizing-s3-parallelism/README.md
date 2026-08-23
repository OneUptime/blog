# Size Hudi Files and Write Parallelism for S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Amazon S3, File Sizing, Spark, Performance Tuning

Description: Balance Hudi target file sizes and Spark write parallelism on S3 to avoid tiny objects, skewed tasks, and slow queries.

---

On Amazon S3, a Hudi job can be fast while producing a layout that makes every downstream query slower. Excessive Spark write parallelism, tiny input batches, and high-cardinality partitions create many small objects. Too little parallelism creates oversized or long-running tasks and concentrates work on a few executors.

Hudi provides both write-time auto-sizing and post-write clustering. The important part is to tune them together with Spark partitioning rather than treating a target file size as a guaranteed result.

This guide targets Apache Hudi 1.2.x and Parquet base files.

## Start from Hudi's sizing model

The official file-sizing guide documents a default target Parquet base-file size of 120 MiB, controlled by `hoodie.parquet.max.file.size`. Hudi tries to append inserts to eligible small file groups until they approach that target.

The companion `hoodie.parquet.small.file.limit` controls which files are considered small enough to receive more inserts. For example:

```text
hoodie.parquet.small.file.limit=104857600
hoodie.parquet.max.file.size=125829120
```

This identifies files below 100 MiB as small and targets 120 MiB base files. The limit should normally be below the target. A value of zero disables small-file handling for this path and forces new file groups, which can improve ingestion latency at the cost of more objects.

Auto-sizing is not a hard byte limit. Compression ratio, record-size estimates, partition boundaries, updates, pending compaction, and the amount of data available all affect output. Hudi learns average record size from commit metadata after initial writes, so the first batch deserves special measurement.

The `bulk_insert` operation does not use normal ingestion auto-sizing. Control its input partitioning and sort mode, or cluster afterward.

## Estimate useful task count

Use compressed output, not raw source bytes, to estimate the number of target files:

```text
estimated files = compressed bytes written / target file bytes
```

If a batch is expected to write 600 GiB at a 120 MiB target, it needs roughly 5,120 output files across all table partitions. That is an estimate, not an instruction to set every shuffle option to 5,120. Each table partition needs at least enough data to fill its own files, and upserts are routed to existing file groups by the index.

Hudi's Spark tuning guide recommends starting write shuffle parallelism at least around input size divided by 500 MB:

```text
hoodie.upsert.shuffle.parallelism
hoodie.insert.shuffle.parallelism
hoodie.bulkinsert.shuffle.parallelism
```

Only the property relevant to the operation is used. Profile the Spark DAG before overriding defaults, because modern Hudi can derive or follow input parallelism in several paths.

## Avoid one task per tiny partition

Table partitioning is a lower bound on fragmentation. If an hourly job writes 2 MiB to each of 10,000 customer partitions, no amount of global coalescing can make 120 MiB files without changing that layout. Hudi cannot combine different table partition paths into one base file.

Prefer partition columns that are commonly filtered and accumulate meaningful data, such as event date or a bounded region. Keep high-cardinality tenant or device identifiers as regular columns unless isolation requirements justify their storage cost.

Before writing, inspect:

```python
from pyspark.sql import functions as F

source.groupBy("event_date").agg(
    F.count("*").alias("rows"),
    F.approx_count_distinct("order_id").alias("keys"),
).orderBy("rows").show(100, truncate=False)
```

Skew matters as much as total size. A single hot date or null partition can dominate one stage while thousands of cold partitions emit tiny files.

## Configure by write operation

For normal upserts:

```python
options = {
    "hoodie.table.name": "orders",
    "hoodie.datasource.write.operation": "upsert",
    "hoodie.datasource.write.recordkey.field": "order_id",
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.table.ordering.fields": "source_lsn",
    "hoodie.parquet.small.file.limit": "104857600",
    "hoodie.parquet.max.file.size": "125829120",
    "hoodie.upsert.shuffle.parallelism": "800",
}
```

Treat 800 as a workload-specific example. Raise parallelism when tasks process too much data, spill heavily, or run much longer than their peers. Lower it when most tasks write tiny output, scheduler overhead dominates, or a small batch is fragmented across far more tasks than useful files.

For initial `bulk_insert`, use `GLOBAL_SORT` for the strongest packing or `PARTITION_SORT` for a lower-cost compromise. The default `NONE` mode prioritizes speed and follows input layout more closely.

## Account for S3 behavior

Small files impose more object requests, metadata, task startup, and query-planning work per useful byte. Large files reduce object count but increase the cost of rewrites, recovery, compaction, and skewed single tasks.

Enable and keep Hudi's metadata table healthy. In Hudi 1.2, `hoodie.metadata.enable` is enabled by default on the write side and stores file listings so engines do not need expensive recursive S3 listings. This reduces listing overhead but does not remove the query and execution cost of opening thousands of tiny files.

Do not manually compact by moving or concatenating S3 objects. Hudi file names, timeline metadata, indexes, and file groups must change transactionally through Hudi table services.

## Measure the committed layout

After each representative run, calculate:

- Active base-file count and size percentiles by table partition.
- New file groups versus updated file groups.
- Records and bytes written per Spark task.
- Task duration, shuffle spill, and skew.
- S3 request volume and query planning time.
- Hudi commit duration and write amplification.

Set a useful band, not one exact size. For a 120 MiB target, a fleet of 110-125 MiB files is healthy; low-volume partition tails will be smaller. Alert on trends such as the percentage below 16 MiB or the count of files per GiB rather than flagging every tail file.

If small files accumulate despite normal upserts, check whether the small-file limit is zero, whether pending compaction or logs make file slices ineligible, whether batches are too small, and whether table partitioning is too granular.

## Use clustering as a controlled repair

Clustering can combine small files and optionally reorder data. Set `hoodie.clustering.plan.strategy.small.file.limit` and `hoodie.clustering.plan.strategy.target.file.max.bytes` explicitly because clustering defaults do not necessarily match `hoodie.parquet.max.file.size`.

Schedule clustering for closed or low-update partitions, verify its replace commit, and let Hudi cleaning remove obsolete file versions. If every micro-batch requires immediate clustering, reconsider the input parallelism and partition design first.

## Official Documentation

- [Apache Hudi file sizing](https://hudi.apache.org/docs/file_sizing/)
- [Apache Hudi Spark tuning guide](https://hudi.apache.org/docs/tuning-guide/)
- [Apache Hudi write operations](https://hudi.apache.org/docs/write_operations/)
- [Apache Hudi clustering](https://hudi.apache.org/docs/clustering/)
- [Apache Hudi table metadata](https://hudi.apache.org/docs/metadata/)

## Conclusion

Size Hudi files on S3 by aligning the 120 MiB-style target with actual compressed volume, table partitions, and Spark task count. Tune operation-specific parallelism from observed task data, retain metadata-backed listing, and use clustering for residual layout repair rather than as a substitute for sound ingestion design.
