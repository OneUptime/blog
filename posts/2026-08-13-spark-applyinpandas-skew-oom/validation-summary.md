# Validation Summary: Prevent `applyInPandas()` from OOMing on One Skewed Group

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Spark SQL and DataFrames
- PySpark `GroupedData.applyInPandas()`
- Pandas and Apache Arrow data interchange
- Grouped Pandas functions and iterator-based grouped execution
- Shuffle partitioning and data skew
- Native Spark aggregation and window functions
- Key salting and decomposable aggregation
- Executor, Python-worker, and container memory management
- Spark Web UI diagnostics

## Sources Consulted
- [PySpark `GroupedData.applyInPandas()` API](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.applyInPandas.html) - function signatures, full-shuffle requirement, complete-group materialization for the DataFrame form, iterator support, and OOM warning.
- [Spark 4.1.0 `applyInPandas()` API](https://spark.apache.org/docs/4.1.0/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.applyInPandas.html) and [Spark 4.1.0 release notes](https://spark.apache.org/releases/spark-release-4.1.0.html) - introduction and version boundary of `Iterator[pandas.DataFrame]` grouped execution.
- [SPARK-53562](https://issues.apache.org/jira/browse/SPARK-53562) and [SPARK-53614](https://issues.apache.org/jira/browse/SPARK-53614) - official Apache Spark changes for grouped Arrow-batch slicing and the iterator form of `applyInPandas()`.
- [Apache Arrow in PySpark](https://spark.apache.org/docs/latest/api/python/tutorial/sql/arrow_pandas.html) and [PySpark `DataFrame.mapInPandas()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.mapInPandas.html) - Pandas function APIs, Arrow transfer, and ordinary iterator-batch behavior.
- [Apache Spark 4.2.0 grouped Pandas serializer](https://github.com/apache/spark/blob/v4.2.0/python/pyspark/sql/pandas/serializers.py) and [grouped Arrow input implementation](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/python/PythonArrowInput.scala) - authoritative implementation details showing batch slicing, classic-form reassembly, and lazy iterator consumption.
- [Spark SQL NULL semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html) and [PySpark `Column.eqNullSafe()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Column.eqNullSafe.html) - grouping of null keys and null-safe join equality.
- [PySpark `encode()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.encode.html), [`length()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.length.html), [`coalesce()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.coalesce.html), and [`count()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.count.html) - byte-proxy and row-count expression behavior.
- [PySpark `xxhash64()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.xxhash64.html) and [`pmod()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.pmod.html) - salting expression signatures, result types, and hash behavior.
- [Spark SQL built-in aggregate functions](https://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#aggregate-functions) and [window functions](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-window.html) - native alternatives to full-group Pandas execution.
- [Spark SQL performance tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html), [Spark configuration](https://spark.apache.org/docs/latest/configuration.html), and [Spark Web UI](https://spark.apache.org/docs/latest/web-ui.html) - shuffle partitioning, executor/PySpark memory accounting, and task metrics.

## Issues Found
1. **Outdated Arrow batch-limit explanation** - The post said `spark.sql.execution.arrow.maxRecordsPerBatch` does not split a grouped-map group. Spark 4.1 and later do slice grouped input into Arrow transport batches. The classic DataFrame form still recombines all of those batches into one Pandas DataFrame, so the setting does not bound the function's full-group Pandas memory. Updated the introduction and Arrow-settings section to distinguish transport batching from Pandas materialization, and changed the description from Arrow materializing the group to Pandas materializing it.
2. **`NULL` hot keys were not routed by the joins** - The original `left_anti` and `left_semi` joins used ordinary equality through a same-name join column. Spark groups all null keys together, but ordinary equality does not match `NULL` to `NULL`; consequently, a detected hot null group would remain in `normal` and be absent from `hot`. Replaced both joins with an aliased `Column.eqNullSafe()` condition.
3. **Iterator guidance lacked the concrete version and memory semantics** - Replaced the release-conditional wording with the verified Spark 4.1-and-later boundary and explained that iterator input lowers peak memory only when the function consumes batches lazily, maintains bounded state, and does not retain the full group.
4. **Salting assumptions were incomplete** - Added that `event_id` must be non-null and sufficiently varied, because null or repeated IDs concentrate rows in a bucket. Clarified that means require the corresponding non-null count and that floating-point sums can vary in low-order bits when salting changes the merge order.

## Review Notes
- All five Python code blocks passed syntax parsing. Representative versions of the profiling, filtering, `applyInPandas()`, native aggregation, null-safe hot-key routing, salting, classic grouped batching, and iterator grouped batching examples ran successfully with PySpark 4.2.0, Pandas 2.3.3, PyArrow 25.0.1, and Java 17.
- All external links in the post returned HTTP 200 and resolved to the intended documentation pages.
- `GroupedData.applyInPandas()` is available from Spark 3.0, the PySpark `pmod()` function from Spark 3.4, and grouped `Iterator[pandas.DataFrame]` support from Spark 4.1. The post now identifies the only version-sensitive behavior it recommends directly.
- The code intentionally assumes existing `events`, `compute_features`, and `output_schema` objects; the snippets are internally valid as illustrative fragments rather than standalone programs.
- Spark's peak execution memory task metric covers Spark-managed execution structures, not Python/Pandas resident memory. The post correctly directs readers to correlate Spark metrics with Python-worker, container, pod, and cluster-manager observations.
