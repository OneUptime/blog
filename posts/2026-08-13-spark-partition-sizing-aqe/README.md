# Size Spark Partitions from Input Bytes, Cores, and AQE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Partitions, Adaptive Query Execution, Spark SQL, Performance Tuning, Data Engineering

Description: Set separate input and shuffle partition budgets from measured bytes, available cores, task memory, and Adaptive Query Execution instead of one magic count.

---

There is no universally correct Spark partition count. Spark normally runs one task per partition in a stage, making a partition a unit of parallel work and, for that task, a unit of working data. Too few partitions leave cores idle and create large per-task working sets. Too many add scheduling, file-open, serialization, and shuffle-block overhead. The correct starting point depends on which boundary you are sizing: file scan, RDD transformation, SQL shuffle, or output files.

Treat “number of partitions” as several related controls, not one knob.

## Identify the Partition Boundary First

For Spark SQL file sources, Spark groups files and file ranges into scan partitions. Important controls include `spark.sql.files.maxPartitionBytes`, the maximum bytes packed into one file-source partition, and `spark.sql.files.openCostInBytes`, an estimated open cost used while packing files. Minimum and maximum partition-number settings can further influence the split proposal where supported.

For SQL shuffles introduced by operations such as joins or aggregations, `spark.sql.shuffle.partitions` normally supplies the partition count. When AQE coalescing is enabled, an explicitly set `spark.sql.adaptive.coalescePartitions.initialPartitionNum` supplies the initial count instead; otherwise it falls back to `spark.sql.shuffle.partitions`. AQE can coalesce post-shuffle partitions using actual map-output statistics. That does not retroactively resize the original file scan.

RDD key operations use their explicit partition argument, an existing partitioner where applicable, or defaults such as `spark.default.parallelism`. Output partitions then usually determine the number of task output files, although the writer and data source can add their own behavior.

Changing the wrong setting explains many “Spark ignored my partitions” reports.

## Start with a Byte Budget

For a first file-scan estimate, use:

```text
estimated scan tasks = ceil(total splittable input bytes / target bytes per task)
```

This is an engineering estimate, not Spark's complete file-packing algorithm. File open cost, compressed formats, unsplittable files, partition pruning, and data-source behavior affect the actual plan. Compressed bytes also do not directly reveal the decoded in-memory working set.

Choose the target by measurement. Run a representative slice and inspect task input bytes, duration, GC time, peak execution memory, and spill in the stage detail. If a typical task is memory-stressed or spills heavily, reduce its data budget or fix the operation that expands its working set. If tasks finish extremely quickly and scheduler overhead dominates, a larger target may be appropriate.

For many tiny files, increasing `maxPartitionBytes` alone may not help because Spark accounts for an open cost for each file. The performance-tuning guide explicitly exposes `openCostInBytes` for this packing decision. It is a planning model, not a claim that opening every file transfers that many bytes.

## Check Whether the Cluster Gets Enough Waves

Let `C` be the number of task slots actually available to the stage. A partition count below `C` cannot occupy every slot. A count only slightly above `C` gives little opportunity to absorb slow hosts or uneven partitions. Spark's tuning guide recommends, as a general starting point, multiple tasks per CPU core; use the current official guide for the precise recommendation applicable to your release.

Combine the byte and core views:

```text
initial partitions = max(byte-based estimate, enough tasks for several core waves)
```

Then apply constraints. A task must have enough working memory for joins, sorts, aggregation maps, decoded rows, and user code. Conversely, millions of tiny tasks are not justified just because the cluster has many cores. Stage scheduling delay and task-launch rate become visible in the UI.

Dynamic allocation complicates the calculation: use the executors expected while this stage runs, not the configured maximum that is never reached. Pending-task backlog can request executors, but provisioning delay may mean early waves execute on a smaller cluster.

## Give AQE a Useful Initial Shuffle

AQE can use runtime map-output statistics to coalesce adjacent post-shuffle partitions. This supports a practical pattern: begin with enough shuffle partitions to protect parallelism and per-task memory, then let AQE combine small partitions toward its advisory size.

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set(
    "spark.sql.adaptive.coalescePartitions.parallelismFirst",
    "false",
)
spark.conf.set("spark.sql.shuffle.partitions", "1200")
spark.conf.set(
    "spark.sql.adaptive.advisoryPartitionSizeInBytes",
    str(64 * 1024 * 1024),
)
```

The `1200` initial count is an example, not a default or recommendation. The 64 MiB advisory size is Spark's current default, while `parallelismFirst=false` deliberately changes its default so that AQE respects that target. Validate these settings against your workload and Spark release. If the initial count is too low, coalescing cannot create the missing parallelism; other AQE rules may split qualifying skewed join partitions, but that is a narrower optimization with specific plan and threshold conditions.

Use `df.explain(mode="formatted")` before the action and the SQL tab afterward. An adaptive plan can show both the initial and final plan. Confirm that an `AQEShuffleRead` marked `coalesced` or `coalesced and skewed` actually appeared rather than assuming the configuration changed execution.

## Size Reduce Tasks by Their Working Set

Input bytes are insufficient for aggregations and joins. One row can fan out in a many-to-many join, one key can dominate a reducer, and object overhead can make the in-memory representation much larger than encoded input.

In the stage UI, compare median and maximum values for:

- task duration and scheduler delay;
- shuffle read bytes and records;
- peak execution memory;
- memory and disk spill;
- GC time;
- fetch wait time.

Uniform large tasks suggest the global partition count is too low. One or two extreme tasks among otherwise healthy peers suggest skew, not a global shortage of partitions. Raising every partition count does not split a single hot key under ordinary hash partitioning.

Spark's tuning guide notes that reduce-side shuffle operations may build large in-memory structures and recommends increasing parallelism when each task's input set is too large. Apply that advice only after checking skew and row expansion.

## Keep Output File Count Separate

A good computation partition size may produce the wrong file layout. Thousands of appropriately sized shuffle tasks can create thousands of tiny output files after a selective filter. Conversely, collapsing to one output partition may serialize the final stage on one executor.

Use `coalesce()` for a measured decrease when the existing distribution is already acceptable, or `repartition()` when balancing requires a shuffle. For SQL, partitioning hints provide related controls. Choose output partitions from expected output bytes and the read patterns of downstream systems, not from original input size.

Avoid forcing one number across daily volumes. Record input bytes, output bytes, task distributions, and final AQE partitions for several representative runs. If volume changes significantly, calculate or configure an initial partition budget accordingly and retain guardrails for minimum useful parallelism.

## A Repeatable Tuning Loop

1. Confirm pruning and the actual files read.
2. Separate scan, shuffle, and output partition counts.
3. Estimate partitions from total bytes and a measured task-byte target.
4. ensure several waves over the cores expected for the stage.
5. Run one representative workload with event logging enabled.
6. Inspect medians and outliers for duration, memory, spill, GC, and fetch wait.
7. Confirm the final adaptive plan and partition count.
8. Change one boundary, rerun, and compare both runtime and resource cost.

This produces a defensible range rather than a folklore constant.

## Official Documentation

- [Spark SQL Performance Tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Spark Configuration](https://spark.apache.org/docs/latest/configuration.html)
- [Spark Tuning Guide: Level of Parallelism and Reduce Memory](https://spark.apache.org/docs/latest/tuning.html)
- [Spark Web UI: Stage Metrics](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark Monitoring and Instrumentation](https://spark.apache.org/docs/latest/monitoring.html)
- [PySpark DataFrame `repartition()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html)
- [PySpark DataFrame `coalesce()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.coalesce.html)
- [PySpark DataFrame `explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)

## Conclusion

Size partitions at the boundary where they are created. Derive a starting count from measured bytes and enough task waves, then check whether the per-task working set fits. Give AQE adequate initial shuffle parallelism and verify its final plan rather than relying on defaults. Finally, tune output files as a separate data-layout decision. The useful answer is a measured operating range for each stage, not one partition number for the entire application.
