# Choose HDFS Block Size for Compressed and Splittable Inputs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, MapReduce, Compression, Performance

Description: Choose an HDFS block size by measuring file shape, input split behavior, compression splittability, mapper duration, NameNode metadata, and recovery cost.

---

HDFS block size is a storage-layout choice, not a universal performance knob. It controls the preferred length of blocks created for a file and therefore influences block count, replica placement, transfer and recovery units, and-in many file-based MapReduce jobs-the natural input-split size.

The correct choice depends on whether the input can be split, how it is compressed, how long each task runs, and how much metadata the NameNode must hold. Start with those properties rather than copying a number from another cluster.

## Separate HDFS Blocks from Input Splits

For an ordinary replicated file, an HDFS block is a logical storage and replica-placement unit. Erasure-coded files instead use striped block groups composed of data and parity internal blocks. An `InputSplit` is a logical unit of work assigned to one mapper. These storage and execution units can influence one another, but they are not the same object.

The standard `FileInputFormat` computes logical splits using file length, HDFS block locations, format constraints, and configured minimum and maximum split sizes. A record reader then respects record boundaries. A line that crosses a block boundary can still be read correctly; HDFS blocks do not cut the application's record model.

The MapReduce tutorial says the number of maps is usually driven by input size and block count, but applications can change split behavior. Engines such as Spark, Hive, and query systems add their own partition planning. Always inspect the actual plan.

## The Current Default Is Only a Starting Point

Current Hadoop's `dfs.blocksize` default is 134,217,728 bytes, or 128 MiB. The setting is explicitly described as the default for new files. A client can choose another supported block size when creating a file.

Larger blocks generally mean:

- fewer blocks and less NameNode block metadata;
- fewer natural map splits for splittable files;
- longer work per task and less launch overhead; and
- larger units for replica transfer and recovery and, when input splits follow blocks, more work per task retry.

Smaller blocks generally mean:

- more available parallel splits;
- shorter individual tasks and retries;
- more NameNode metadata and block reports; and
- greater task-launch and scheduling overhead.

Neither direction is always faster.

## Case 1: Uncompressed, Splittable Inputs

Plain text and many record formats can be split at logical offsets. For a large file using an ordinary file input format, block size is often an upper bound or strong input to split calculation.

Estimate task duration from measured scan throughput:

```text
target_split_bytes = measured_mapper_bytes_per_second × target_task_seconds
```

If a mapper sustains 40 MiB/s and the desired useful runtime is 120 seconds, a first experiment around 4,800 MiB (about 4.69 GiB) per split may seem mathematically attractive. But test it: CPU, decompression, remote reads, spills, skew, and downstream output can dominate. A multi-gigabyte block also increases recovery and locality constraints.

The official MapReduce tutorial gives a broad heuristic that maps should run at least about a minute to amortize setup and that practical parallelism can be many maps per node. Treat those as a starting range, not a service guarantee.

## Case 2: Unsplittable Files

If the input format returns `false` from `isSplitable`, one file is normally processed as one logical split regardless of how many HDFS blocks store it. Making `dfs.blocksize` smaller does not turn one unsplittable file into parallel map tasks.

This matters for stream-compressed files such as ordinary gzip text. A 500 GiB `.gz` file may occupy thousands of HDFS blocks but still be processed by one mapper because decompression must start from the stream beginning.

The remedies are at the data-format layer:

- produce several sensibly sized files;
- choose a splittable codec or container format;
- partition the data before compression; or
- rewrite legacy files during an offline migration.

Avoid creating thousands of tiny gzip files. That restores parallelism at the cost of the HDFS small-files problem and excessive mapper startup.

## Case 3: Splittable Compression

Splittability is codec and format specific. Hadoop's `BZip2Codec` implements `SplittableCompressionCodec`, while ordinary stream compression may not. Container formats can provide internal boundaries-such as blocks, row groups, or stripes-that allow readers to start at selected positions even when data inside those units is compressed.

Ask three distinct questions:

1. Does the codec support a split input stream?
2. Does the file format expose valid synchronization or index boundaries?
3. Does the engine's input format actually use them?

A `.bz2` extension or a columnar file is not enough evidence by itself. Confirm using job plans and map input records.

Aligning HDFS block size, file-format unit size, and engine split size can improve locality, but exact equality is not mandatory. File-format units that span HDFS blocks are valid; they may simply require reads from more locations.

## Account for File Size Distribution

Block size affects only files large enough to contain multiple blocks. A 10 MiB file occupies one short final block whether the preferred size is 128 MiB or 512 MiB. HDFS does not reserve the unused portion, but the NameNode still stores file and block metadata.

Collect percentiles:

```text
p50 file size
p90 file size
p99 file size
maximum file size
files smaller than one candidate block
blocks per file at each candidate
```

If 95% of files are smaller than 20 MiB, changing from 128 MiB to 256 MiB will barely change block count. Compaction is the relevant intervention.

## Estimate Metadata Impact

For each ordinary replicated non-empty file:

```text
block_count ≈ ceiling(file_length / block_size)
```

Sum across the actual distribution rather than dividing total bytes by block size. The latter ignores per-file final blocks and dramatically underestimates block count for small files.

Do not apply this estimate directly to erasure-coded data. Model its block groups, data and parity units, cell size, and NameNode metadata separately for the selected EC policy.

Compare candidates using `BlocksTotal`, `FilesTotal`, NameNode heap, checkpoint duration, and block-report processing. Larger blocks can slow block-count growth for large files, but they do not reduce file and directory objects.

## Preserve Enough Parallelism

Suppose a daily partition has 2 TiB of splittable input:

| Block or split target | Approximate splits |
| --- | ---: |
| 128 MiB | 16,384 |
| 256 MiB | 8,192 |
| 512 MiB | 4,096 |
| 1 GiB | 2,048 |

Those counts are only planning estimates. The best option depends on available containers, task duration, file boundaries, engine coalescing, and skew. If the cluster can run 2,000 maps at once, 2,048 balanced splits provide little second-wave slack; 16,384 very short tasks may overwhelm scheduling.

Favor enough splits for load balancing and failure recovery, but not so many that setup dominates.

## Consider Write, Recovery, and Network Behavior

Replicated files recover at block-replica granularity. A larger block takes longer to copy after a DataNode failure and can hold a transfer slot for longer. Erasure-coded files recover missing internal blocks from their stripe and require a separate reconstruction model. A larger input split may also make speculative retry or a failed mapper redo more work.

Conversely, many small blocks expand NameNode queues, DataNode block reports, scanner work, and per-block checksums and files. The right point depends on disk and network throughput, failure-recovery objective, NameNode capacity, and concurrent write pipelines.

Test degraded scenarios, not only healthy scan throughput:

- one DataNode unavailable;
- remote-rack reads;
- re-replication after node loss;
- mapper failure near task completion; and
- large concurrent backfills.

## Set Block Size for New Files Deliberately

Cluster default:

```xml
<property>
  <name>dfs.blocksize</name>
  <value>268435456</value>
</property>
```

Client-specific create, where supported by the command invocation:

```bash
hdfs dfs -Ddfs.blocksize=268435456 -put data.parquet /warehouse/stage/
```

The value must satisfy `dfs.namenode.fs-limits.min-block-size`. Use binary units consistently and verify the created file rather than assuming every ingestion engine honors the client property:

```bash
hdfs dfs -stat 'block_size=%o bytes size=%b bytes name=%n' \
  /warehouse/stage/data.parquet
hdfs fsck /warehouse/stage/data.parquet -files -blocks -locations
```

Application APIs can pass an explicit block size during file creation, overriding the default.

## Run a Representative Benchmark

For each candidate, write new files with identical records and format settings. Measure:

- file and block counts;
- input splits and map tasks;
- p50 and p95 task runtime;
- launch time as a fraction of task time;
- local, rack-local, and remote bytes;
- throughput, CPU, and shuffle spill;
- NameNode RPC and heap impact;
- failed-task retry cost; and
- re-replication time.

Use a production-like file-size distribution and concurrency. A single ideal file hides small-file and skew effects.

## Official Documentation

- [HDFS Architecture: data blocks](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html#Data_Blocks)
- [HDFS default configuration](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml)
- [MapReduce Tutorial](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html)
- [`FileInputFormat` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/lib/input/FileInputFormat.html)
- [`BZip2Codec` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/io/compress/BZip2Codec.html)
- [FileSystem Shell: `stat`](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html#stat)

## Conclusion

Choose HDFS block size from actual split behavior, not raw file extensions or cluster folklore. Large splittable files benefit from a balance between metadata and task parallelism; unsplittable files require a format or partitioning change; tiny files require compaction. Benchmark new-file layouts under both normal and failure conditions, then verify what every writer actually created.
