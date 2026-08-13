# Choose Native Spark Functions, Arrow UDFs, or Pandas UDFs in PySpark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, PySpark, Pandas UDF, Apache Arrow, UDF, Performance Tuning

Description: Choose the narrowest PySpark execution path by preferring optimizable Spark expressions, then Arrow-optimized scalar UDFs or vectorized Pandas UDFs when Python is necessary.

---

No PySpark UDF category is “actually faster” for every function. The first decision is whether Python should run at all. Native Spark SQL expressions remain visible to Spark's optimizer and execute in Spark's engine. Python UDFs cross the JVM/Python boundary and make the custom logic less transparent to planning. Apache Arrow improves data transfer and serialization, while Pandas UDFs add vectorized Pandas/NumPy execution. Neither removes the cost of Python or guarantees that the function itself is efficient.

Use this order of preference:

1. built-in Spark SQL/DataFrame functions;
2. composition of higher-order SQL functions for arrays and maps;
3. an Arrow-optimized scalar Python UDF for scalar Python logic;
4. a scalar Pandas UDF when the implementation is naturally vectorized;
5. grouped or iterator Pandas APIs only when their broader semantics are required.

Benchmark the smallest valid alternatives on representative data.

## Native Expressions Give Spark the Most Information

Suppose a pipeline normalizes an identifier:

```python
from pyspark.sql import functions as F

native = events.withColumn(
    "normalized_id",
    F.upper(F.trim(F.regexp_replace("raw_id", "[^A-Za-z0-9]", ""))),
)
```

Spark can see the projection, data types, filters, and expression tree. Built-in functions participate in SQL planning and avoid sending every value to a Python worker. The official SQL function catalog is larger than many teams realize: string, datetime, JSON, collection, aggregate, and higher-order functions can replace substantial Python code.

Inspect the plan:

```python
native.explain(mode="codegen")
native.explain(mode="formatted")
```

Not every native expression receives identical code generation, and “native” alone does not ensure a good algorithm. It is nevertheless the baseline to beat because it avoids a language boundary and exposes more semantics to Spark.

## Arrow-Optimized Scalar UDFs Preserve Row-at-a-Time Python

An Arrow-optimized scalar Python UDF created with `udf(..., useArrow=True)` is still scalar Python logic: values are presented as Python objects and the function operates one row at a time. It is distinct from the vectorized `arrow_udf()` API introduced in Spark 4.1, whose functions operate directly on PyArrow arrays. Arrow supplies batched columnar transfer/serialization between the JVM and Python and more coherent type coercion than the pickled path described in the PySpark guide.

```python
from pyspark.sql.functions import udf

@udf("string", useArrow=True)
def normalize_id(value):
    if value is None:
        return None
    return "".join(
        ch.upper() for ch in value if ch.isascii() and ch.isalnum()
    )

arrow_scalar = events.withColumn("normalized_id", normalize_id("raw_id"))
```

Choose this when no native expression reasonably represents the logic and the implementation is inherently scalar or depends on a Python-only library. Specify the return type and test null/type behavior. Arrow's conversion rules can differ from the legacy pickled UDF path, so correctness tests must cover edge types and nulls.

Arrow batching reduces transfer overhead; the Python loop and opaque function remain. For cheap operations such as trimming and uppercasing, the native expression will normally be the more appropriate baseline.

## Pandas UDFs Are for Vectorized Series Work

Series-to-Series Pandas UDFs receive one or more Pandas `Series` and return a `Series` in batches transferred with Arrow. Their output length must match the input length. They are effective when the implementation uses vectorized Pandas or NumPy operations rather than a Python loop:

```python
import pandas as pd
from pyspark.sql.functions import pandas_udf

@pandas_udf("double")
def centered_ratio(value: pd.Series, baseline: pd.Series) -> pd.Series:
    safe_baseline = baseline.where(baseline != 0)
    return (value - baseline) / safe_baseline

with_ratio = events.withColumn(
    "centered_ratio",
    centered_ratio("value", "baseline"),
)
```

This example is also expressible natively and should be benchmarked against native arithmetic. A Pandas UDF becomes compelling when the needed vectorized algorithm or Python library has no adequate Spark expression.

Avoid wrapping a Python `for` loop in a Pandas UDF. That pays Arrow and Pandas conversion costs without gaining vectorized computation. Similarly, tiny batches can make fixed worker/batch overhead dominate.

Spark exposes `spark.sql.execution.arrow.maxRecordsPerBatch` to bound row count in Arrow record batches for APIs where it applies. Row count is not a byte guarantee: wide strings and nested values can make a small batch large. Tune only after observing Python-worker memory and task behavior.

## Do Not Treat Grouped Pandas APIs as Faster Scalar UDFs

`groupBy().applyInPandas()` implements split-apply-combine and performs a full shuffle. Its single-DataFrame form loads all rows and columns for a group into one Pandas DataFrame before applying the function. The Arrow batch row limit does not bound that whole-group DataFrame. Use this form for algorithms that truly require complete group context and whose maximum group can fit—not as a generic vectorization switch. On Spark 4.1 and later, the iterator-of-DataFrames form can mitigate whole-group memory pressure when the algorithm can process each group's batches incrementally.

`mapInPandas()` operates on iterators of Pandas DataFrames and allows arbitrary output length. It is appropriate for partition/batch transformations that need DataFrame semantics. Again, it is a broader contract with different memory and cardinality implications.

Choose the API by semantics first:

- one output per input row: native expression, Arrow scalar UDF, or scalar Pandas UDF;
- arbitrary transformation per Arrow batch/partition: `mapInPandas()`;
- arbitrary transformation requiring all records for a key: the single-DataFrame form of `applyInPandas()`, after bounding group size.

## Build a Fair Benchmark

Lazy evaluation and caching make casual notebook timings misleading. Create equivalent outputs and force complete evaluation through a production-like sink or a full aggregate. Use the same input, partitioning, projection, and warm/cold conditions.

```python
import time

def timed_count(label, df):
    started = time.perf_counter()
    rows = df.select("normalized_id").where("normalized_id IS NOT NULL").count()
    elapsed = time.perf_counter() - started
    print(label, rows, elapsed)

timed_count("native", native)
timed_count("arrow_scalar", arrow_scalar)
```

Repeat runs, randomize order, and avoid letting one candidate benefit from cache created by another unless caching is explicitly part of all candidates. Count validates row production but may allow column pruning in some plans; use a sink or checksum-like aggregate that forces the transformed column when necessary.

Compare more than wall time:

- physical plan and Python evaluation nodes;
- executor CPU time versus JVM GC time;
- Python worker memory and failures;
- input/output rows and Arrow batch sizing;
- serialization/deserialization overhead;
- correctness for nulls, timestamps, decimals, and nested values.

The fastest result with different coercion or null semantics is not equivalent.

## Operational Guardrails

Pin compatible Python, Pandas, and PyArrow environments on the driver and executors according to the Spark release's dependency documentation. Initialize expensive read-only Python state once per worker/iterator where the API supports it rather than once per row. Never create external clients per scalar invocation.

Keep return schemas explicit. Reduce columns before the Python boundary. Filter with native expressions first. If the UDF is deterministic and reusable, still confirm whether plan structure causes repeated evaluation; materialization has a cost and should be intentional.

## Preserve Semantics While Rewriting

A native replacement is valid only when it matches the Python function's contract. Test empty strings, Unicode, nulls, time zones, decimal precision, NaN values, and malformed inputs. Spark SQL, Python, Pandas, and Arrow can differ in coercion and missing-value behavior. Use a representative golden dataset and compare both values and schema.

Marking a Python UDF nondeterministic where appropriate is also a correctness decision; Spark may otherwise reason about repeated deterministic expressions differently. Avoid network calls, random state, and mutable global side effects inside any UDF. They make retries and speculative task attempts observable and invalidate a simple performance comparison.

## Official Documentation

- [PySpark Guide: Python UDF and UDTF Categories](https://spark.apache.org/docs/latest/api/python/user_guide/udfandudtf.html)
- [Apache Arrow in PySpark](https://spark.apache.org/docs/latest/api/python/tutorial/sql/arrow_pandas.html)
- [PySpark `udf()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.udf.html)
- [PySpark `arrow_udf()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.arrow_udf.html)
- [PySpark `pandas_udf()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.pandas_udf.html)
- [PySpark DataFrame `mapInPandas()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.mapInPandas.html)
- [PySpark GroupedData `applyInPandas()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.applyInPandas.html)
- [Spark SQL Built-in Functions](https://spark.apache.org/docs/latest/sql-ref-functions-builtin.html)
- [PySpark DataFrame `explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)

## Conclusion

Prefer a native Spark expression whenever it can state the same logic clearly. Arrow-optimized scalar UDFs make row-at-a-time Python transfer more efficient; Pandas UDFs add value when the algorithm is genuinely vectorized. Grouped Pandas APIs solve different, more memory-intensive problems. Select by semantics, force equivalent work in a benchmark, and validate types and nulls before accepting a speed result.
