# Fix a Spark Broadcast Join Timeout Without Hiding a Bad Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Spark SQL, Broadcast Join, Query Planning, Statistics, Performance Tuning

Description: Decide whether a Spark broadcast timeout needs more time, corrected table statistics, a smaller build side, or a non-broadcast join using plan and runtime evidence.

---

A Spark broadcast join timeout is not automatically a request to raise `spark.sql.broadcastTimeout`. On execution paths that enforce this setting, the timeout says the join waited longer than allowed for the broadcast exchange, whose preparation includes collecting and constructing the build relation and creating its broadcast variable. The build-side query may be slow, the relation may be far larger than the optimizer believed, a manual hint may be forcing the wrong strategy, or the driver may be struggling to collect, construct, and serialize an otherwise reasonable relation. Since Spark 3.2, AQE's `BroadcastQueryStageExec` materialization does not enforce `spark.sql.broadcastTimeout`, so increasing the setting does not bound or fix a wait on that adaptive stage.

The right question is: **should this relation be broadcast at all?** Answer that before extending how long Spark waits.

## Confirm the Executed Join, Not the Intended Join

Use `explain()` to inspect the pre-execution plan:

```python
joined.explain(mode="cost")
joined.explain(mode="formatted")
```

`cost` prints logical-plan statistics when they are available. `formatted` separates the physical-plan outline from node details. These calls do not execute the DataFrame. After running a representative action, inspect the final or latest adaptive plan in the SQL tab because Adaptive Query Execution (AQE) may change a planned sort-merge join to a broadcast join when runtime statistics make one side eligible. Look for `BroadcastHashJoin` or `BroadcastNestedLoopJoin` and its `BroadcastExchange` child.

Then establish why Spark chose it:

- a `broadcast()` call or `BROADCAST` SQL hint explicitly requested it;
- estimated relation size fell under `spark.sql.autoBroadcastJoinThreshold`;
- AQE used runtime size and its adaptive broadcast threshold;
- the join shape led Spark to a broadcast nested-loop strategy rather than a hash equi-join.

Join hints are advisory within the strategies supported by the join type, but a broadcast hint is deliberately prioritized over several other join hints. A hint can request broadcast even when the relation's estimated size exceeds the automatic threshold. Search the query code and views before blaming automatic planning.

## Validate Statistics and the Build-Side Query

Stale or inaccurate statistics can make a large relation look small. Missing statistics can also prevent Spark from choosing a good plan; by default, Spark treats an unknown table size conservatively as `Long.MaxValue`, so missing size statistics alone do not make a table automatically broadcastable. For tables and catalogs that support it, Spark SQL's `ANALYZE TABLE` statement collects table statistics for the optimizer. `NOSCAN` collects size information without a full scan; column analysis collects column statistics as specified.

```sql
ANALYZE TABLE analytics.customers COMPUTE STATISTICS;
ANALYZE TABLE analytics.customers
  COMPUTE STATISTICS FOR COLUMNS customer_id, status;

EXPLAIN COST
SELECT /* no forced hint while diagnosing */ *
FROM analytics.events e
JOIN analytics.customers c
  ON e.customer_id = c.customer_id
WHERE c.status = 'active';
```

If you expect column statistics to affect filter-cardinality estimates, verify that `spark.sql.cbo.enabled` is `true`; it is `false` by default. Statistics are inputs to planning, not promises about runtime size after every expression. A filter backed by weak statistics, an exploding projection, a union, or a Python UDF can make estimates inaccurate. Compare the estimated size with the BroadcastExchange runtime metrics in the SQL UI when they are available. A timed-out exchange may not publish its driver-side size metrics, so do not interpret a blank or zero metric as proof that the relation is small.

Also time the build side by itself with the same filters and projection. If it spends most of the timeout scanning files, evaluating a UDF, or waiting for an upstream exchange, increasing the broadcast wait timeout addresses the symptom rather than the slow subquery.

## Make the Broadcast Relation Deliberately Small

Broadcast only the rows and columns needed by the join and output:

```python
from pyspark.sql import functions as F

dimension = (
    customers
    .where(F.col("status") == "active")
    .select("customer_id", "segment")
)

result = events.join(F.broadcast(dimension), "customer_id", "left")
```

Projection matters because each executor running join tasks fetches and materializes the broadcast relation. Remove unused wide strings, arrays, and nested payloads. Filter before the hint. If duplicate dimension keys are accidental, correct them according to a deterministic business rule before joining; duplicate build rows also multiply output.

Do not cache an oversized relation merely to make broadcast succeed. Cache storage and broadcast memory are different lifecycle decisions, and caching can add materialization and eviction pressure. Measure the build-side row count and runtime relation size rather than inferring safety from the source file size.

## Distinguish Four Root Causes

### Wrong strategy

Evidence: a manual hint, large runtime broadcast size, executor memory pressure, or repeated timeout after a complete build. Remove the broadcast hint and let Spark choose, lower/disable automatic broadcasting for the session while testing, or use a supported merge hint to evaluate a sort-merge plan.

```python
test_session = spark.newSession()
test_session.conf.set("spark.sql.autoBroadcastJoinThreshold", "-1")
test_session.conf.set(
    "spark.sql.adaptive.autoBroadcastJoinThreshold", "-1"
)
```

Configuration is session-scoped here; create the DataFrames through `test_session` and build the test query from them. Remove any explicit broadcast hint as well. Disabling broadcast globally may hurt unrelated joins, so use a controlled comparison.

### Bad or stale statistics

Evidence: `EXPLAIN COST` reports a tiny estimate while runtime metrics show a much larger relation. Refresh table and relevant column statistics using the catalog's supported workflow, then re-plan the query. Confirm that the data source/catalog actually supplies the statistics Spark uses.

### Slow build-side computation

Evidence: the BroadcastExchange's child scan or transformation dominates collection time. Fix file listing, pruning, filters, UDFs, or upstream shuffles. On a path that enforces the broadcast timeout, increasing it would allow the slow computation to continue without improving it.

### Appropriate broadcast, insufficient timeout

On a non-AQE path that enforces this setting, evidence from representative runs shows that the runtime relation is intentionally small, memory is healthy, and normal variance makes the join's wait for build-side collection, relation construction, and broadcast-variable creation approach or occasionally exceed the current limit. In this narrower case, set a timeout based on repeated wait and exchange timings plus a reasoned margin:

```python
spark.conf.set("spark.sql.broadcastTimeout", "600")
```

The value is an example in seconds, not a recommendation. Raising it increases how long a failed or stuck broadcast can delay the query. Keep an application-level runtime guardrail.

## Compare the Alternative End to End

Run the same representative input with the corrected broadcast plan and a non-broadcast plan. Compare:

- BroadcastExchange duration and data size;
- driver and executor memory pressure;
- shuffle read/write bytes for the alternative;
- join output rows;
- total query runtime and repeated-run variance.

A sort-merge join typically redistributes and sorts inputs whose existing partitioning and ordering do not satisfy its requirements, but it avoids replicating a complete build relation to each participating executor. An initially planned broadcast join avoids the required large-side shuffle when the build relation is genuinely small. An AQE conversion may occur after shuffle output has been materialized, so it can avoid sorting and, with local shuffle readers, remote reads but cannot undo completed shuffle work. The cheaper plan depends on actual filtered sizes, partitioning, cluster resources, and reuse-not the table's label as a “dimension.”

AQE can improve the decision when runtime sizes differ from static estimates, but it still needs a supported join shape and sensible thresholds. Inspect the final plan every time the behavior is surprising.

## Keep Timeout and Memory as Separate Guardrails

A longer broadcast timeout, where enforced, grants more time; it does not grant driver or executor memory. The build relation is collected and constructed on the driver, then fetched and materialized by executors running the join, so validate driver memory, executor memory, and concurrent broadcast activity independently. A relation that finishes building after ten minutes can still destabilize participating executors when their tasks materialize it.

Conversely, on a path that enforces the setting, a timeout can occur with a small final payload when its child query is slow. Record both build duration and broadcast data size. Alert on each separately: duration catches regressions in scans and upstream transformations, while size protects the replication cost. This makes a future timeout review evidence-based instead of normalizing an ever-increasing global setting.

## Official Documentation

- [Spark SQL Performance Tuning: Broadcast Joins and AQE](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Spark SQL `ANALYZE TABLE`](https://spark.apache.org/docs/latest/sql-ref-syntax-aux-analyze-table.html)
- [Spark SQL `EXPLAIN`](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-explain.html)
- [PySpark DataFrame `explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)
- [PySpark `broadcast()` Function](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.broadcast.html)
- [Spark SQL Join Syntax](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html)
- [Spark Configuration](https://spark.apache.org/docs/latest/configuration.html)
- [Spark Web UI: SQL Metrics](https://spark.apache.org/docs/latest/web-ui.html)

## Conclusion

Treat a broadcast timeout as a plan-validation failure first. Find the executed join and the reason it was selected, compare estimated and runtime size, and isolate build-side time. Shrink the relation or correct statistics when possible; stop broadcasting when the payload or join shape is wrong. Raise the timeout only on a path that enforces it and when evidence shows that a valid, bounded broadcast needs slightly more wait time under normal conditions.
