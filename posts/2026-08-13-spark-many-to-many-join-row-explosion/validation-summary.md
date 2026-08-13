# Validation Summary: Diagnose a Spark Many-to-Many Join That Explodes Row Count

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Apache Spark
- Spark SQL joins, null semantics, and cardinality
- PySpark DataFrame and Column APIs
- PySpark window functions
- Adaptive Query Execution and skew-join optimization
- Spark Web UI metrics
- Data-quality and uniqueness checks

## Sources Consulted

- [Spark SQL JOIN syntax](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html)
- [PySpark `DataFrame.join()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html)
- [Spark SQL null semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html)
- [PySpark `Column.eqNullSafe()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Column.eqNullSafe.html)
- [PySpark `functions.count()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.count.html) and [`functions.sum()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.sum.html)
- [Spark SQL data types](https://spark.apache.org/docs/latest/sql-ref-datatypes.html)
- [Spark SQL ANSI compliance and overflow behavior](https://spark.apache.org/docs/latest/sql-ref-ansi-compliance.html)
- [PySpark `functions.row_number()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.row_number.html) and [`Window.orderBy()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Window.orderBy.html)
- [PySpark `DataFrame.dropDuplicates()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.dropDuplicates.html)
- [Spark SQL performance tuning: optimizing skew joins](https://spark.apache.org/docs/latest/sql-performance-tuning.html#optimizing-skew-join)
- [PySpark `DataFrame.explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)
- [Spark Web UI and SQL metrics](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark RDD programming guide: shuffle operations](https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations)

## Issues Found

- The predicted-row aggregate used `sum()` directly. Spark returns `NULL` for `SUM` over an empty input, so a join with no matching keys was predicted as `NULL` instead of zero. The aggregate now uses `coalesce` with a decimal zero.
- The example multiplied two 64-bit counts before applying any wider numeric type, so a sufficiently large per-key product could overflow. Both operands are now cast to `decimal(38,0)` before multiplication, and the explanation now requires the chosen type to hold both each product and the aggregate sum.
- The reconciliation text treated arithmetic overflow only as a possible count mismatch. With current default ANSI behavior, Spark raises an overflow error. The text now covers either a mismatch or an overflow error.
- The “latest record wins” example described a complete ordering without stating the requirement on its last ordering column. The post now says that `record_id` must be a stable, unique final tie-breaker within each key; otherwise tied rows are not selected deterministically.
- The statement that exact uniqueness checks always cost a shuffle was too absolute because Spark can reuse compatible partitioning. It now says such checks normally require a shuffle.

## Review Notes

All referenced documentation URLs resolve to current official Apache Spark pages; `/docs/latest/` identified itself as Spark 4.2.0 during validation. The edited examples were also executed successfully with local PySpark 4.2.0, including matching predicted and actual fanout, the zero-match case, formatted plan output, deterministic window selection, pre-aggregation, left-semi join behavior, and the temporal predicate. No deprecated APIs or stale version-specific claims remain.
