# Validation Summary: Why Spark AQE Is Not Fixing Your Skewed Join

## Status
validated

## Post Type
Troubleshooting / Performance Tuning Guide

## Technologies Covered
- Apache Spark SQL
- Adaptive Query Execution (AQE)
- AQE skew-join optimization
- Sort-merge, shuffled-hash, and broadcast-hash joins
- PySpark DataFrame API
- Spark Web UI and runtime metrics
- SQL join and null semantics

## Sources Consulted
- Apache Spark SQL Performance Tuning, including AQE, skew joins, coalescing, broadcast conversion, and join hints: https://spark.apache.org/docs/latest/sql-performance-tuning.html
- Apache Spark runtime SQL configuration table: https://spark.apache.org/docs/latest/generated-runtime-sql-config-table.html
- Apache Spark 4.2.0 `OptimizeSkewedJoin` implementation: https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/adaptive/OptimizeSkewedJoin.scala
- Apache Spark 4.2.0 `AQEShuffleReadExec` implementation and skew metrics: https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/adaptive/AQEShuffleReadExec.scala
- SPARK-35214, shuffled-hash join skew optimization: https://issues.apache.org/jira/browse/SPARK-35214
- SPARK-44065, broadcast-hash join skew optimization: https://issues.apache.org/jira/browse/SPARK-44065
- Apache Spark Web UI and Monitoring documentation: https://spark.apache.org/docs/latest/web-ui.html and https://spark.apache.org/docs/latest/monitoring.html
- PySpark `RuntimeConfig` and DataFrame API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.conf.RuntimeConfig.html and https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html
- Apache Spark SQL join syntax and null semantics: https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html and https://spark.apache.org/docs/latest/sql-ref-null-semantics.html
- Apache Spark ANSI overflow behavior and `Count` result type: https://spark.apache.org/docs/latest/sql-ref-ansi-compliance.html and https://github.com/apache/spark/blob/v4.2.0/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/expressions/aggregate/Count.scala
- PySpark `DataFrame.explain()` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html

## Issues Found
- **Join eligibility was described as sort-merge-only.** The post excluded `ShuffledHashJoin` and all `BroadcastHashJoin` plans. Spark 3.2 and later also optimize qualifying shuffled-hash joins, and Spark 4.2 can split the shuffled streamed side of a broadcast-hash join when the local shuffle reader is disabled. Updated the introduction, strategy section, fanout discussion, diagnostic checklist, and conclusion. The revised text also notes that join type, split side, and shuffle shape affect eligibility.
- **Mid-execution configuration behavior was stated too absolutely.** The post said settings changed after execution starts cannot affect that execution. Adaptive rules read session configuration as they run, so observation can be timing-dependent. Replaced the claim with guidance to set values before the action and not rely on mid-execution changes.
- **One threshold example misstated a ratio.** A 600 MiB partition is less than twice, not twice, a 350 MiB median. Corrected the wording without changing the example's conclusion.
- **Stage correlation relied on “exchange IDs.”** Physical-plan/operator identifiers, AQE query-stage identifiers, and scheduler stage IDs are not interchangeable. Replaced this with the supported correlation path through the associated SQL query and its `Exchange` or `AQEShuffleRead` nodes and metrics.
- **The fanout statement applied `L × R` too broadly.** Restricted it to a matching key in an inner equi-join. The profiling example now casts both `LongType` counts to `decimal(38,0)` before multiplication to prevent 64-bit overflow.
- **The fanout profiler could miss the null-key case discussed later.** Its string-column join uses ordinary equality and excludes grouped null keys. Added a requirement to mirror the production key normalization and null semantics. Also qualified the semi-join recommendation to cases where only right-side match existence is required.
- **The coalescing description ignored `parallelismFirst`.** With `spark.sql.adaptive.coalescePartitions.parallelismFirst=true`, Spark derives its coalescing target from cluster parallelism instead of respecting the advisory size. Updated the explanation accordingly.
- **The join-hints documentation fragment was stale.** Changed `#join-strategy-hints-for-sql-queries` to the current `#join-strategy-hints` fragment.

## Review Notes
- The official performance-tuning prose still emphasizes sort-merge skew joins, while the current runtime configuration documentation and versioned implementation also cover shuffled-hash joins and the narrow Spark 4.2 broadcast-hash case. The post now makes that version dependency explicit.
- The `/docs/latest/` links currently resolve to Apache Spark 4.2.0 and are floating links; future Spark releases may change supported join shapes or defaults.
