# Choose `repartition()`, `coalesce()`, or `repartitionByRange()` in Spark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, PySpark, Partitioning, Shuffle, DataFrames, Performance Tuning

Description: Match Spark repartitioning APIs to balancing, narrow partition reduction, hash distribution, range ordering, and output-file goals without accidental bottlenecks.

---

`repartition()`, `coalesce()`, and `repartitionByRange()` can all change a DataFrame's partition count, but they express different data-movement contracts. Choose from the distribution required by the *next* expensive operation. Choosing only from the desired output file count can create an avoidable shuffle, preserve severe skew, or collapse the job onto too few executors.

## `repartition()`: Pay for Redistribution When You Need Balance

`DataFrame.repartition(numPartitions, *cols)` returns a hash-partitioned DataFrame when partitioning expressions are supplied. All rows with the same expression values are assigned consistently by that partitioning expression, subject to the configured number of partitions.

```python
balanced = events.repartition(400)
by_customer = events.repartition(400, "customer_id")
```

The first form redistributes toward the requested number of partitions without promising grouping by a business key. The second hash-partitions by `customer_id`, which can help a following key-based operation when Spark can reuse compatible partitioning. It cannot make a hot key smaller: every row for that key still hashes together.

Use `repartition()` when:

- increasing the number of partitions;
- decreasing partitions while also correcting imbalance;
- distributing by columns needed downstream;
- producing a more even set of output tasks after skewed upstream work.

The exchange is expensive: rows are serialized, moved, and written/read through the shuffle machinery. Confirm in `explain(mode="formatted")` whether another downstream exchange makes your explicit repartition redundant.

## `coalesce()`: Merge Existing Partitions Without Full Redistribution

`DataFrame.coalesce(n)` returns exactly `n` partitions and uses a narrow dependency when decreasing the count. It combines existing partitions rather than evenly reshuffling all rows.

```python
reduced = heavily_filtered.coalesce(40)
```

This is valuable after a strong filter when the remaining parent partitions are already reasonably balanced. It avoids a full exchange and reduces tiny output tasks.

The API documentation warns about drastic coalescing. Calling `coalesce(1)` can place the computation on one node because upstream work may continue through the narrow dependency with very limited parallelism. If you require a balanced single final partition, `repartition(1)` introduces a shuffle so upstream partitions can execute in parallel before the final exchange—though the final single-partition work is still inherently serialized.

Use `coalesce()` when all three are true:

1. the partition count is decreasing;
2. the existing distribution is sufficiently balanced;
3. avoiding an exchange matters more than rebalancing.

Do not use it to repair skew. A narrow merge can combine a huge parent partition with others; it does not split that partition.

## `repartitionByRange()`: Build Ordered Key Ranges

`DataFrame.repartitionByRange(n, *cols)` range-partitions rows by the supplied ordering expressions:

```python
from pyspark.sql import functions as F

ranged = events.repartitionByRange(
    200,
    F.col("event_date").asc(),
    F.col("customer_id").asc(),
)
```

Range partitioning is appropriate when downstream work benefits from contiguous key ranges: distributed sorts, range-oriented processing, or writing data whose partitions should cover ordered intervals. It does not globally sort every row by itself. If ordering within each partition is required, add `sortWithinPartitions()`:

```python
ordered = ranged.sortWithinPartitions("event_date", "customer_id")
```

The API notes that range boundaries are estimated through sampling, so the output may not be fully consistent across runs. Highly concentrated values can also yield uneven ranges. Inspect task and output sizes rather than assuming range partitioning guarantees equal byte counts.

## Do Not Confuse Distribution with Storage Partitioning

`repartition("event_date")` controls execution distribution. `DataFrameWriter.partitionBy("event_date")` lays out output in filesystem-style directories by distinct column values. They solve different problems.

You may combine them deliberately:

```python
(
    events
    .repartition(200, "event_date")
    .write
    .mode("append")
    .partitionBy("event_date")
    .parquet("s3://analytics/events")
)
```

This does not guarantee exactly one file per date. Multiple Spark partitions can contain a date, and task retries or writer behavior also matter. Avoid high-cardinality directory partition columns; the writer documentation describes `partitionBy` as a filesystem layout suitable for columns with limited distinct values.

## Choose by the Next Boundary

Consider common situations:

### After filtering 95 percent of rows

If surviving data remains spread fairly evenly, `coalesce()` can reduce task and file overhead without a shuffle. If a few partitions contain almost all survivors, use `repartition()` to rebalance.

### Before a join or aggregation

First inspect the plan. Spark inserts required exchanges and may already use a suitable partitioning. Explicitly repartition by the key only when measurement shows a reusable benefit or you need control that the optimizer does not provide. For Spark SQL, AQE can coalesce post-shuffle partitions and handle qualifying skewed sort-merge joins.

### Before ordered range processing

Use `repartitionByRange()` on the range key, followed by `sortWithinPartitions()` if consumers require local order. Use a global `orderBy()` only when the result contract requires total ordering.

### Before writing fewer files

Estimate output bytes, choose a target file-size range appropriate for downstream readers, and calculate a starting output partition count. Use `coalesce()` if only a balanced decrease is needed; use `repartition()` if the upstream distribution is uneven. File count is an outcome to verify, not an API guarantee.

## Prove the Choice in the Plan and UI

Use these checks before and after the action:

```python
candidate.explain(mode="formatted")
print(candidate.rdd.getNumPartitions())
```

In the SQL tab, find `Exchange`, `AQEShuffleRead`, and sort nodes. In the stage detail, compare task duration, shuffle bytes, peak execution memory, spill, and output size. A successful repartition should improve the downstream distribution enough to repay its shuffle cost. A successful coalesce should reduce overhead without creating long tail tasks.

Avoid chaining partition operations without checking the optimized plan. SQL partitioning hints are resolved with optimizer rules, and the leftmost applicable hint can determine the chosen exchange. Clear, single-purpose repartitioning near the boundary is easier to reason about.

## Treat the Partition Count as a Measured Intermediate Contract

`getNumPartitions()` reports the DataFrame's current RDD partition count at that point, but later optimizer exchanges and AQE may produce a different partitioning for execution. Record both the declared count and the final adaptive plan. If a downstream library relies on partition-local ordering or grouping, document the exact operation after which that property holds; a subsequent shuffle invalidates it.

Partitioning also does not imply uniqueness, completeness, or equal size. Hash partitions can be extremely uneven under hot keys, and range partitions can be uneven under concentrated distributions or samples. Add a small partition profile—rows, relevant bytes, and min/max key where meaningful—to the benchmark. This prevents a nominal “200 partitions” result from hiding one partition that contains most of the work.

Finally, do not expose Spark partition IDs as stable business identifiers. Task retries, changed upstream partitioning, AQE, and different input splits can change them. Persist business keys and ordering fields, not `spark_partition_id()`, when downstream correctness needs identity.

## Official Documentation

- [PySpark DataFrame `repartition()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html)
- [PySpark DataFrame `coalesce()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.coalesce.html)
- [PySpark DataFrame `repartitionByRange()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartitionByRange.html)
- [PySpark DataFrame `sortWithinPartitions()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.sortWithinPartitions.html)
- [Spark SQL Performance Tuning: Partitioning Hints and AQE](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Spark RDD Programming Guide: Shuffle Operations](https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations)
- [PySpark DataFrameWriter `partitionBy()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.partitionBy.html)
- [PySpark DataFrame `explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)

## Conclusion

Use `repartition()` when rows must move to gain parallelism, balance, or hash distribution. Use `coalesce()` for a measured, balanced decrease that should avoid a full exchange. Use `repartitionByRange()` when ordered key ranges are the required distribution, adding local sorting separately when needed. Read the physical plan and task distribution: the right operation is the one whose downstream benefit is larger than its movement cost.
