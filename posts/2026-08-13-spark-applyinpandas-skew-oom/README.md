# Prevent `applyInPandas()` from OOMing on One Skewed Group

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, PySpark, applyInPandas, Pandas UDF, Data Skew, Memory Management

Description: Bound grouped Pandas memory by measuring group bytes, reducing the schema, isolating hot keys, and changing the algorithm before Pandas materializes an oversized group.

---

`groupBy().applyInPandas()` has a hard memory boundary: for the DataFrame form, Spark shuffles rows by key and loads all rows and columns for one group into a Pandas DataFrame before calling your function. The official API warns that a skewed group can cause an out-of-memory failure. `spark.sql.execution.arrow.maxRecordsPerBatch` does not cap the Pandas DataFrame passed to that form. Spark 4.1 and later can slice the transfer into Arrow record batches, but the Python worker recombines those batches before calling a DataFrame-form function.

That means a single key can fail an otherwise well-partitioned job. Increasing the number of shuffle partitions does not split equal grouping keys; hash partitioning still sends the entire key to one task.

## Prove That One Group Is the Boundary

Start with key counts, but include a byte-oriented proxy because rows can vary dramatically in width:

```python
from pyspark.sql import functions as F

group_profile = (
    events
    .groupBy("account_id")
    .agg(
        F.count(F.lit(1)).alias("rows"),
        F.sum(
            F.length(F.encode(F.coalesce("payload", F.lit("")), "UTF-8"))
        ).alias("payload_bytes"),
    )
)

group_profile.orderBy(
    F.desc("payload_bytes"), F.desc("rows")
).show(50, truncate=False)
```

This measures one selected string payload, not complete in-memory Pandas size. Account for every selected column, Arrow buffers, Pandas indexes/objects, temporary arrays created by the function, and output. Use it to rank groups, then reproduce the largest group with production-like executor and Python-worker limits.

In the Spark UI, the failing stage should show one or a few tasks with extreme shuffle-read records/bytes, duration, peak memory, spill, or executor loss. Executor logs distinguish JVM heap failure, Python worker termination, container memory-overhead kill, and unrelated disk/network errors.

## Project Before the Shuffle and Python Boundary

`applyInPandas()` passes all columns in the grouped DataFrame. Remove unused fields and filter rows first:

```python
prepared = (
    events
    .where("event_time >= TIMESTAMP '2026-08-01 00:00:00'")
    .select("account_id", "event_time", "value")
)

result = prepared.groupBy("account_id").applyInPandas(
    compute_features,
    schema="account_id string, mean_value double, event_count long",
)
```

This reduces network transfer and group materialization. Do not carry a large JSON payload into Pandas when the function needs only two parsed scalars. Parse or derive those scalars with native Spark functions before grouping when possible.

The returned Pandas DataFrame also consumes memory. Emit only required rows and columns; avoid retaining both multiple copies of the input and a large output inside the function.

## Ask Whether the Algorithm Really Needs the Whole Group

Many uses of `applyInPandas()` are aggregations that Spark already implements distributively. Mean, standard deviation, quantiles, counts, conditional sums, and many window calculations have native functions. Native aggregation can combine partial results before the final reduce boundary instead of materializing every group's raw rows in Pandas.

```python
native = events.groupBy("account_id").agg(
    F.avg("value").alias("mean_value"),
    F.count(F.lit(1)).alias("event_count"),
    F.stddev_samp("value").alias("sample_stddev"),
)
```

For custom algebraic aggregates, consider an implementation that maintains bounded sufficient statistics. For ordered computations, determine whether a native Window expression can express the requirement. Removing the grouped Pandas boundary is usually stronger than adding memory.

## Isolate Unsplittable Hot Keys

If most groups fit but a known set does not, split the workflow by key class:

```python
hot_keys = group_profile.where(
    (F.col("rows") > 2_000_000) | (F.col("payload_bytes") > 512 * 1024 * 1024)
).select("account_id")

e = events.alias("e")
h = hot_keys.alias("h")
same_account = F.col("e.account_id").eqNullSafe(F.col("h.account_id"))

normal = e.join(h, same_account, "left_anti")
hot = e.join(h, same_account, "left_semi")

normal_result = normal.groupBy("account_id").applyInPandas(
    compute_features, output_schema
)
```

The thresholds are illustrative and must be derived from measured memory. Process `hot` with a different bounded algorithm, an offline path with explicitly larger resources, or quarantine it with an observable error. This prevents one tenant or sentinel key from repeatedly killing the ordinary path.

Be careful with `NULL`: all null grouping values form one group. If null means “unknown independent entity,” grouping by it is semantically wrong as well as memory-dangerous. Filter, impute with a legitimate identifier, or route nulls according to the data contract.

## Salt Only When the Function Is Decomposable

Salting adds a sub-key so one logical group becomes several physical groups:

```python
salted = events.withColumn(
    "salt",
    F.pmod(F.xxhash64("event_id"), F.lit(32)),
)
```

This assumes `event_id` is non-null and sufficiently varied within each account; null or heavily repeated IDs can leave one salt bucket skewed. Salting is safe only if partial results can be merged into exactly the same final answer. Counts and sums of exact numeric types are straightforward; floating-point sums can differ in low-order bits when the merge order changes. Means require sum and the corresponding non-null count, not an average of averages. Arbitrary models, order-dependent algorithms, medians, and functions requiring every pair of rows may not have an exact bounded merge.

A correct decomposable pattern is:

1. group by `(account_id, salt)` and compute bounded partial state;
2. return only that partial state;
3. group by `account_id` in Spark and merge states with a mathematically valid combiner.

Never salt simply to make the error disappear. Validate the salted result against the unsalted algorithm on smaller groups and document the merge law.

## Understand What More Partitions and Arrow Settings Can Do

Raising `spark.sql.shuffle.partitions` can reduce the number of *different keys* handled by one task and improve concurrency. It cannot divide one key for `groupBy(account_id)`. Before Spark 4.1, `spark.sql.execution.arrow.maxRecordsPerBatch` was not applied to grouped-map groups. Spark 4.1 and later slice grouped input into Arrow record batches, but the DataFrame form reassembles those batches before calling the function, so lowering the limit does not bound full-group Pandas memory.

More executor memory may be a controlled last resort when a legitimate maximum group is bounded and the full-group algorithm is unavoidable. Size the executor container for JVM heap, Python process memory, Arrow/Pandas buffers, native libraries, and overhead. Prove the high-percentile and maximum group sizes; otherwise growth merely moves the next failure threshold.

Spark 4.1 and later support an iterator form selected with `Iterator[pandas.DataFrame]` type hints. It can consume a group's Arrow batches lazily and reduce peak memory when the function maintains bounded state and streams its output. It does not split a key across tasks or make an algorithm that retains all rows bounded.

## Add a Preflight Contract

Production should reject unsafe input before the expensive grouped function. Persist metrics such as maximum rows per group, selected payload bytes per group, number of groups above the supported limit, and the identity of top keys. Compare them with a declared envelope owned by the algorithm.

Test the function locally with synthetic worst-case Pandas DataFrames, including nulls, wide values, and maximum output. Then run a Spark integration test containing a hot group. The contract should specify whether oversized keys are processed differently, quarantined, or cause the batch to fail early.

## Measure Outside the JVM Heap

The Python worker and Arrow/Pandas native allocations may live outside the executor JVM heap while still counting against the executor container or pod limit. A healthy-looking JVM heap graph therefore does not disprove memory pressure. Correlate container resident memory, Python worker exits, cluster-manager kill reasons, and JVM metrics at the same timestamp.

Temporary copies matter. Pandas operations such as sorting, merging, changing dtype, or assigning several new columns can allocate multiples of the input DataFrame before old buffers are released. Profile peak memory inside `compute_features` with a worst-case group rather than sizing only from the incoming Arrow payload. Reduce intermediate lifetimes and avoid copying the whole frame when a few Series suffice.

## Official Documentation

- [PySpark GroupedData `applyInPandas()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.applyInPandas.html)
- [Apache Arrow in PySpark: Pandas Function APIs](https://spark.apache.org/docs/latest/api/python/tutorial/sql/arrow_pandas.html#pandas-function-apis)
- [PySpark `pandas_udf()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.pandas_udf.html)
- [PySpark DataFrame `mapInPandas()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.mapInPandas.html)
- [Spark SQL Built-in Aggregate Functions](https://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#aggregate-functions)
- [Spark SQL Window Functions](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-window.html)
- [Spark SQL Performance Tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Spark Web UI: Task Metrics](https://spark.apache.org/docs/latest/web-ui.html)

## Conclusion

An `applyInPandas()` OOM is usually a group-size contract failure, not a generic lack of shuffle partitions. Measure the largest groups, project aggressively, and replace full-group Python with native or decomposable aggregation where possible. Route truly hot keys through a bounded alternate path and salt only with a correct merge law. Memory increases are defensible only after the legitimate maximum group is known and tested.
