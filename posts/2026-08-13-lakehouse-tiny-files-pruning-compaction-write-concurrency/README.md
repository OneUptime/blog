# Why Lakehouse Partitions Create Tiny Files-and How to Fix the Write Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Iceberg, Apache Hive, Data Lakehouse, Small Files, Compaction, Apache Spark

Description: Diagnose tiny lakehouse files from partition fan-out, task sizing, micro-batches, and concurrent writers, then tune distribution and run bounded Iceberg compaction.

---

Partitioning does not create large files; it creates boundaries that files cannot cross. If one Spark task writes rows to many Iceberg partitions, if streaming commits contain little data, or if many writers independently touch the same partitions, each task or writer can leave a small file in each boundary. A 512 MB target file property cannot combine output across tasks or commits by itself.

Fix the production path before scheduling endless compaction. Then use compaction as maintenance for unavoidable streaming and concurrency.

## Measure the File Distribution

Iceberg's Spark <code>files</code> metadata table exposes the current snapshot's data and delete files:

~~~sql
SELECT
    content,
    spec_id,
    partition,
    count(*) AS files,
    sum(file_size_in_bytes) AS bytes,
    avg(file_size_in_bytes) AS avg_bytes,
    percentile_approx(file_size_in_bytes, 0.5) AS p50_bytes,
    percentile_approx(file_size_in_bytes, 0.95) AS p95_bytes
FROM prod.observability.events.files
GROUP BY content, spec_id, partition
ORDER BY files DESC;
~~~

Syntax and available aggregate functions depend on the engine. In Spark, <code>content = 0</code> identifies data files; other content values represent delete files according to the format. Keep them separate because data-file and delete-file maintenance differ.

Also measure:

- files created per snapshot;
- bytes and records per file;
- partitions touched per commit;
- tasks and writers per partition;
- data versus delete-file counts;
- manifest count and planning time;
- object-store request and file-open latency;
- write duration and shuffle size.

Use the current <code>files</code> table for current-state sizing. “All” metadata tables can return the same file more than once across snapshots, so they are not a direct current file count without snapshot-aware deduplication.

## Cause 1: Partition Fan-Out

Suppose a batch has 500 MB of uncompressed input spread over 1,000 hourly tenant partitions. No output file can span an Iceberg partition boundary. Even perfect packing has little data per partition.

Over-partitioning often comes from combining high-cardinality identity fields with fine time:

~~~text
day(event_time) × tenant_id × region × event_type
~~~

Calculate bytes per populated partition per commit:

~~~text
expected file payload
  ≈ compressed bytes in commit
    / populated partition count
    / concurrent writers per partition
~~~

If that value is 2 MB, setting a 512 MB target cannot produce 512 MB files. Coarsen the partition transform, remove a dimension, or increase the amount of data grouped per commit. Use sort order and column metrics for filtering dimensions that do not need physical partition fields.

Iceberg hidden partitioning makes evolution possible: new data can use a coarser or different spec while old files retain their spec. That is a metadata change for future writes, not an automatic rewrite of old tiny files.

## Cause 2: Spark Tasks Are Too Small

Iceberg's Spark write documentation states two key constraints:

- a Spark task cannot produce a file larger than the task;
- a file cannot span an Iceberg partition boundary.

Iceberg rolls a file when it grows to <code>write.target-file-size-bytes</code>, but a task must supply enough same-partition data to reach that target. Spark's task-size estimate is not the output file size. In-memory or shuffle rows and compressed columnar Parquet have different sizes, so the AQE advisory task size often needs to be larger than the desired on-disk file.

Inspect:

- <code>write.target-file-size-bytes</code>;
- <code>write.distribution-mode</code>;
- <code>spark.sql.adaptive.enabled</code>;
- <code>spark.sql.adaptive.advisoryPartitionSizeInBytes</code>;
- actual shuffle partitions and task output;
- observed compression ratio by schema.

Change one variable at a time and measure actual files. Do not set enormous tasks without checking executor memory, spill, skew, and retry cost.

## Cause 3: Rows Are Not Clustered for the Writer

Iceberg's clustered Spark writer requires data in each task to be clustered by partition values to limit open file handles. Current Iceberg Spark integration can request distribution:

- <code>none</code>: no requested shuffle;
- <code>hash</code>: hash distribution by partition values;
- <code>range</code>: range distribution by partition or sort order.

Starting with Iceberg 1.2.0, hash is the default for partitioned tables without a sort order. Range is the default when a table has a sort order, while current integrations use none for unpartitioned, unsorted tables. Engine and Iceberg versions matter, and Spark did not respect distribution mode for CTAS/RTAS before Spark 3.5.0.

Set the table property deliberately:

~~~sql
ALTER TABLE prod.observability.events
SET TBLPROPERTIES (
  'write.distribution-mode' = 'hash',
  'write.target-file-size-bytes' = '536870912'
);
~~~

The 512 MB value is Iceberg's documented default and is shown for clarity, not a universal optimum. Choose from scan size, object-store cost, write cadence, and rewrite capacity.

The Spark fanout writer avoids requiring clustered input, but keeps file handles open for partitions touched by a task and uses more memory. It does not merge independent task output into one file. Iceberg's Spark 3.5 and later integrations may select it by default for partitioned, unsorted writes when no ordering is required; selection also depends on the Iceberg version and configuration. When it is used, measure memory and partition fan-out.

## Cause 4: Micro-Batches Are Smaller Than the Target

A streaming job committing every 30 seconds cannot create one 512 MB file per partition if only 10 MB arrives. Options:

- increase trigger interval and commit more data;
- reduce physical partition cardinality;
- accept small ingestion files and compact on a service-level schedule;
- aggregate upstream before the table sink;
- separate low-latency raw ingestion from optimized analytical publication.

Longer batches increase visibility latency and recovery/replay work. Define a freshness objective and a small-file budget rather than maximizing file size at any cost.

Flink's Iceberg maintenance documentation explicitly treats small-file compaction as routine for streaming environments and supports scheduling by commit count, data-file count, bytes, or interval.

## Cause 5: Concurrent Writers Cannot Share Open Files

Ten independent jobs writing 50 MB into the same day partition create at least separate committed files; they cannot append to one shared Parquet file safely. Iceberg supports concurrent writes through optimistic concurrency and atomic metadata commits, but concurrency correctness does not coalesce physical output.

Reduce unnecessary writer count:

- consolidate ingestion for the same table/partition;
- assign disjoint partition ownership when possible;
- stage small producer outputs and batch them;
- make application-level append retries idempotent, and monitor orphan files from failed or speculative attempts;
- schedule compaction after the high-concurrency window.

Do not serialize all writers merely to obtain large files if it violates availability or throughput. Compaction is the intended trade for some workloads.

## Compact With Bounded Iceberg Rewrites

With Spark SQL extensions, Iceberg exposes <code>rewrite_data_files</code>:

~~~sql
CALL prod.system.rewrite_data_files(
  table => 'observability.events',
  strategy => 'binpack',
  where => 'event_time >= TIMESTAMP \'2026-08-12 00:00:00\' AND event_time < TIMESTAMP \'2026-08-13 00:00:00\'',
  options => map(
    'target-file-size-bytes', '536870912',
    'min-input-files', '5',
    'max-concurrent-file-group-rewrites', '4'
  )
);
~~~

Procedure signatures and supported options vary by Iceberg version; use the documentation matching the deployed runtime. The <code>where</code> filter selects files that may contain matching rows, so verify the planned scope.

Iceberg groups rewrite work by partition and file-group size. General options include target, minimum and maximum eligible file sizes, minimum input files, maximum group size, concurrent group rewrites, and partial-progress behavior.

Start with a recent bounded interval. Measure:

- input and output file counts/bytes;
- job shuffle, spill, and duration;
- concurrent-query latency;
- object-store requests;
- commit retries or conflicts;
- new file-size distribution;
- planning improvement.

Partial progress limits the loss from a long failed rewrite but creates multiple commits. More rewrite concurrency shortens the job only until compute, object storage, or catalog commits contend.

## Treat Data, Deletes, and Manifests Separately

Compacting data files does not automatically solve every metadata problem:

- position delete files may require <code>rewrite_position_delete_files</code>; equality delete maintenance is version- and engine-specific;
- many manifests can slow planning and may benefit from <code>rewrite_manifests</code>;
- old snapshots keep references and metadata until expiration;
- orphan-file deletion is a separate, potentially destructive maintenance action.

Follow Iceberg's maintenance and safety guidance. Do not delete files by listing an object-store prefix and guessing that unrecognized paths are obsolete. Snapshots, branches, tags, and in-progress writes can still reference them.

## Balance Pruning Against File Size

Choose a partition spec using two tests:

1. Does the common predicate allow Iceberg to skip a material amount of data?
2. Does each populated partition receive enough bytes per normal commit to form efficient files?

Example:

| Spec | Pruning | Bytes per partition/commit | Result |
| --- | --- | ---: | --- |
| hour + tenant | very fine | 2 MB | chronic tiny files |
| day + tenant bucket | fine | 80 MB | may need compaction |
| day only + sort by tenant/time | coarser | 1.2 GB | large files, metrics/sort help |

Use real skew. One major tenant may form healthy files while thousands of small tenants produce fragments. A bucket transform can cap partition count, but changing bucket count is partition evolution and needs multi-spec testing.

## Define Operating Thresholds

Alert on rates and distributions:

~~~text
p50 data-file size below 64 MB for 3 commits
or
more than 2,000 sub-32-MB data files in an active day
or
planning p95 above 5 seconds
~~~

The numbers are illustrative. Derive them from query open cost, engine split planning, storage API limits, and compaction capacity.

Track compaction debt:

~~~text
eligible bytes / sustainable rewrite bytes per hour
~~~

If debt grows every day, tuning the compactor only postpones failure. Reduce partition fan-out, writer count, or commit frequency.

## Official Documentation

- [Apache Iceberg: Spark Writes and File Sizes](https://iceberg.apache.org/docs/latest/spark-writes/)
- [Apache Iceberg: Configuration Properties](https://iceberg.apache.org/docs/latest/configuration/)
- [Apache Iceberg: Spark Metadata Tables](https://iceberg.apache.org/docs/latest/spark-queries/#inspecting-tables)
- [Apache Iceberg: Spark rewrite_data_files Procedure](https://iceberg.apache.org/docs/latest/spark-procedures/#rewrite_data_files)
- [Apache Iceberg: Maintenance](https://iceberg.apache.org/docs/latest/maintenance/)
- [Apache Iceberg: Flink Table Maintenance](https://iceberg.apache.org/docs/latest/flink-maintenance/)
- [Apache Iceberg: Partitioning](https://iceberg.apache.org/docs/latest/partitioning/)
- [Apache Iceberg: Reliability and Concurrent Writes](https://iceberg.apache.org/docs/latest/reliability/)
- [Apache Hive: Configuration Properties for Created and Merged Files](https://hive.apache.org/docs/latest/user/configuration-properties/)

## Conclusion

Tiny files appear when bytes are divided across too many partition boundaries, tasks, micro-batches, or concurrent writers. A target size is only reachable when a task receives enough same-partition data. Measure Iceberg metadata, reduce unnecessary partition and writer fan-out, tune distribution and task sizing, and accept bounded compaction where low-latency ingestion makes small files unavoidable. If compaction debt grows faster than rewrite capacity, fix the write path rather than adding another maintenance job.
