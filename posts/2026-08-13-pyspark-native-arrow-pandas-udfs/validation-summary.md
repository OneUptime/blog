# Validation Summary: Choose Native Spark Functions, Arrow UDFs, or Pandas UDFs in PySpark

## Status
validated

## Post Type
Technical guide and performance-tuning reference

## Technologies Covered

- Apache Spark 4.2 / Spark SQL
- PySpark DataFrame and SQL functions
- Arrow-optimized scalar Python UDFs
- Vectorized Arrow UDFs (`arrow_udf`)
- Pandas UDFs
- Apache Arrow, PyArrow, Pandas, and NumPy
- `mapInPandas()` and `applyInPandas()`
- Spark query plans, benchmarking, and UDF operational practices

## Sources Consulted

- Apache Spark 4.2, PySpark Guide: Python UDF and UDTF Categories — https://spark.apache.org/docs/4.2.0/api/python/user_guide/udfandudtf.html
- Apache Spark 4.2, Apache Arrow in PySpark — https://spark.apache.org/docs/4.2.0/api/python/tutorial/sql/arrow_pandas.html
- Apache Spark 4.2, `pyspark.sql.functions.udf()` — https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.functions.udf.html
- Apache Spark 4.2, `pyspark.sql.functions.arrow_udf()` — https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.functions.arrow_udf.html
- Apache Spark 4.2, `pyspark.sql.functions.pandas_udf()` — https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.functions.pandas_udf.html
- Apache Spark 4.2, `DataFrame.mapInPandas()` — https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.mapInPandas.html
- Apache Spark 4.2, `GroupedData.applyInPandas()` — https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.applyInPandas.html
- Apache Spark 4.2, built-in SQL functions — https://spark.apache.org/docs/4.2.0/sql-ref-functions-builtin.html
- Apache Spark 4.2, `DataFrame.explain()` — https://spark.apache.org/docs/4.2.0/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html
- Apache Spark 4.2, installation and dependency requirements — https://spark.apache.org/docs/4.2.0/api/python/getting_started/install.html
- Apache Spark 4.2, Python package management — https://spark.apache.org/docs/4.2.0/api/python/tutorial/python_packaging.html
- Apache Spark 4.2, PySpark migration guide — https://spark.apache.org/docs/4.2.0/api/python/migration_guide/pyspark_upgrade.html

## Issues Found

1. **The native and Python normalizers were not semantically equivalent for Unicode input.** The native expression removes every character outside ASCII `[A-Za-z0-9]` before uppercasing, while the original Python UDF uppercased first and retained Unicode alphanumeric characters with `str.isalnum()`. For example, `café` produced `CAF` natively but `CAFÉ` in the UDF. Changed the UDF to retain only ASCII alphanumeric input characters and uppercase those characters, making it match the native expression for null, ASCII, punctuation, whitespace, and Unicode test cases.

2. **“Arrow Python UDF” was ambiguous in current Spark.** Spark 4.1 introduced the separate vectorized `arrow_udf()` API, whose functions operate directly on PyArrow arrays. Clarified that the row-at-a-time example is an Arrow-optimized scalar Python UDF created with `udf(..., useArrow=True)`, distinguished it from `arrow_udf()`, and added the direct official API link.

3. **The Pandas UDF batch description overstated the Pandas objects' backing representation.** Arrow transfers the batches between the JVM and Python, but the resulting Pandas `Series` are not necessarily Arrow-backed. Reworded the statement to describe Series-to-Series Pandas UDFs as operating on Pandas series in batches transferred with Arrow.

4. **The grouped Pandas memory guidance did not account for the iterator form added in Spark 4.1.** Scoped the whole-group materialization warning to the single-DataFrame form of `applyInPandas()` and noted that the iterator-of-DataFrames form can mitigate whole-group memory pressure for incrementally processable algorithms. The full-shuffle warning remains applicable to both forms.

5. **The dependency guidance mentioned executors but omitted the driver.** Updated it to require compatible Python, Pandas, and PyArrow environments on both the driver and executors.

## Review Notes

- The corrected examples were executed successfully with Apache Spark 4.2.0, Pandas 2.3.3, PyArrow 25.0.1, and Java 17. The native expression and corrected Arrow-optimized scalar UDF produced matching values and checksums on ASCII, punctuation, whitespace, Unicode, zero, and null test data. The Pandas UDF also executed with its declared `double` return type.
- Spark 4.2 enables Arrow optimization for regular Python UDFs by default through `spark.sql.execution.pythonUDF.arrow.enabled`. Keeping `useArrow=True` in the example is valid and makes the intended serialization path explicit.
- The documented `codegen` and `formatted` explain modes are current. Plan inspection confirmed the native expression and `ArrowEvalPython` nodes described in the post.
- The benchmark's `IS NOT NULL` filter forces evaluation needed for the null check, but a row count does not validate transformed values. The post correctly recommends a sink or checksum-like aggregate when value evaluation must be guaranteed and compared.
- All documentation and author links in the post resolved during review.
