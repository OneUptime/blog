# Validation Summary: How to Use Apache Spark with Scala

## Status
validated

## Post Type
Tutorial / Getting started guide

## Technologies Covered
- Apache Spark (3.5.0)
- Scala
- Spark SQL / DataFrames
- RDDs (Resilient Distributed Datasets)
- Spark Catalyst optimizer / Tungsten
- Parquet file format
- sbt (build tool)

## Sources Consulted
- Apache Spark official documentation: https://spark.apache.org/docs/3.5.0/
- Spark RDD Programming Guide (persistence/storage levels): https://spark.apache.org/docs/latest/rdd-programming-guide.html#rdd-persistence
- Spark SQL Programming Guide: https://spark.apache.org/docs/latest/sql-programming-guide.html
- SparkSession API docs: https://spark.apache.org/docs/3.5.0/api/scala/org/apache/spark/sql/SparkSession.html
- `org.apache.spark.sql.functions` API: https://spark.apache.org/docs/3.5.0/api/scala/org/apache/spark/sql/functions$.html
- Maven Central for `spark-core` / `spark-sql` 3.5.0 coordinates

## Issues Found
1. **Incorrect description of `StorageLevel.MEMORY_ONLY`.** The original code comment said "fastest but may spill". Per the official Spark RDD Persistence docs, `MEMORY_ONLY` does NOT spill to disk — partitions that don't fit in memory are simply recomputed on the fly when needed. Spilling to disk is the behavior of `MEMORY_AND_DISK`. Fixed the comment to: "fastest, but partitions that don't fit are recomputed (not spilled to disk)".

2. **Broadcast join example missing header option on CSV read.** `spark.read.csv("countries.csv")` without `.option("header", "true")` would produce columns named `_c0`, `_c1`, etc., causing the subsequent `$"code"` column reference in the join to fail with an `AnalysisException`. Added `.option("header", "true")` so the example matches the join clause that follows.

## Review Notes
- Several DataFrame code blocks rely on functions from `org.apache.spark.sql.functions` (e.g., `avg`, `dayofmonth`) without explicitly importing them. The author does explicitly import `broadcast` in the optimization section. Code as written would require `import org.apache.spark.sql.functions._` (or per-function imports) to compile. Left as-is since the snippets are illustrative and the broadcast section establishes the import pattern, but readers copy-pasting individual snippets should add the import.
- Spark 3.5.0 (Sept 2023) is used as the dependency version. Spark 4.0 has since been released, but 3.5.x remains a widely-used, supported stable line and the APIs shown (SparkSession, DataFrame, RDD, SQL, caching, repartition/coalesce, broadcast, Parquet partitioning, `explain(true)`) are unchanged from 3.x to 4.x for the operations demonstrated.
- The "10–100x faster with Tungsten" claim in the comparison table is a long-standing Databricks/Spark benchmarking figure and is workload-dependent; it is a reasonable directional statement rather than a precise guarantee.
- For DataFrames, `cache()` defaults to `MEMORY_AND_DISK` (not `MEMORY_ONLY` as it does for RDDs). The post does not make a contrary claim, so no change was needed, but it is a common point of confusion worth noting.
- The unused `val sorted = grouped.orderBy($"count".desc)` chain in the transformations/actions snippet is fine — the example is meant to illustrate lazy evaluation, not to be a complete program.
