# Validation Summary: Fix a Spark Broadcast Join Timeout Without Hiding a Bad Plan

## Status
validated

## Post Type
Troubleshooting and performance-tuning guide

## Technologies Covered
- Apache Spark 4.2.0
- Spark SQL and Catalyst query planning
- Adaptive Query Execution (AQE)
- Broadcast hash joins and broadcast nested-loop joins
- PySpark DataFrame API
- Spark SQL table and column statistics
- Spark Web UI SQL plans and metrics

## Sources Consulted
- [Spark SQL Performance Tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Spark SQL Configuration](https://spark.apache.org/docs/latest/configuration.html)
- [Spark SQL `ANALYZE TABLE`](https://spark.apache.org/docs/latest/sql-ref-syntax-aux-analyze-table.html)
- [Spark SQL `EXPLAIN`](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-explain.html)
- [Spark SQL Hints](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-hints.html)
- [PySpark `DataFrame.explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)
- [PySpark `broadcast()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.broadcast.html)
- [PySpark `SparkSession.newSession()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.SparkSession.newSession.html)
- [Spark Web UI SQL plans and metrics](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark 4.2.0 `BroadcastExchangeExec` source](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/exchange/BroadcastExchangeExec.scala)
- [Spark 4.2.0 AQE `QueryStageExec` source](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/adaptive/QueryStageExec.scala)
- [Spark 4.2.0 `TorrentBroadcast` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/broadcast/TorrentBroadcast.scala)
- [Spark 4.2.0 `SQLConf` source](https://github.com/apache/spark/blob/v4.2.0/sql/catalyst/src/main/scala/org/apache/spark/sql/internal/SQLConf.scala)
- [Spark 4.2.0 logical-plan statistics source](https://github.com/apache/spark/blob/v4.2.0/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/plans/logical/statsEstimation/LogicalPlanStats.scala)
- [Spark 4.2.0 physical-plan requirements source](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/exchange/EnsureRequirements.scala)
- [Apache Spark issue SPARK-36414: Disable timeout for BroadcastQueryStageExec in AQE](https://issues.apache.org/jira/browse/SPARK-36414)

## Issues Found
1. **The timeout was described as covering executor distribution.** `spark.sql.broadcastTimeout` limits the wait for a non-AQE `BroadcastExchangeExec` future that collects the child rows, constructs the relation, and creates the broadcast variable. Executors fetch TorrentBroadcast blocks lazily when join tasks use the relation, so their later fetch is not part of that timeout. Reworded the affected passages to distinguish exchange preparation on the driver from executor-side fetching and materialization.
2. **Current AQE timeout behavior was omitted.** Since Spark 3.2, AQE `BroadcastQueryStageExec` materialization does not enforce `spark.sql.broadcastTimeout`. Added this version-specific qualification and scoped timeout-increase guidance to execution paths that actually enforce the setting.
3. **The `explain()` calls were presented as if they also inspected a completed adaptive plan.** `DataFrame.explain()` does not execute the DataFrame. Clarified that these calls inspect the pre-execution plan and that a representative action must run before reviewing the final or latest adaptive plan in the SQL UI.
4. **Missing statistics were said to make a large relation look small.** Spark's default unknown table size is `Long.MaxValue`, deliberately above the automatic broadcast threshold. Changed this to distinguish stale or inaccurate statistics, which can understate size, from missing statistics, which conservatively inhibit automatic broadcasting and can still produce a poor plan.
5. **Statistics guidance was too broad for catalogs and filter estimation.** Qualified `ANALYZE TABLE` as applying to tables and catalogs that support it. Added that `spark.sql.cbo.enabled` must be enabled when readers expect collected column statistics to drive filter-cardinality estimates; it is disabled by default.
6. **The non-broadcast comparison disabled only the static threshold.** Added `spark.sql.adaptive.autoBroadcastJoinThreshold = -1`, because an independently configured adaptive threshold could otherwise let AQE convert the test back to a broadcast join. Also clarified that DataFrames must be created through the new session and that explicit broadcast hints must be removed.
7. **Sort-merge and AQE shuffle costs were stated categorically.** Clarified that sort-merge joins add redistribution and sorting only when existing partitioning and ordering do not satisfy their requirements. Also clarified that an initially planned broadcast join avoids the large-side shuffle, while an AQE conversion cannot undo shuffle output already materialized.
8. **Runtime broadcast size was treated as always available after a timeout.** Spark posts the relevant driver-side BroadcastExchange metrics only after successful broadcast-variable creation. Added a warning not to interpret a blank or zero metric after a timeout as proof that the relation is small.

## Review Notes
- The `/latest` Apache Spark documentation links resolved to Spark 4.2.0 during validation.
- The `ANALYZE TABLE`, `EXPLAIN COST`, `DataFrame.explain()`, `functions.broadcast()`, join, `SparkSession.newSession()`, and runtime configuration syntax is current and non-deprecated for the documented Spark APIs.
- `BroadcastExchange` data size is the runtime relation size reported by Spark, not necessarily the compressed serialized size transferred over the network.
