# Fix a Spark Broadcast Join Timeout Without Hiding a Bad Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Spark SQL, Broadcast Join, Query Planning, Statistics, Performance Tuning

Description: Decide whether a Spark broadcast timeout needs more time, corrected table statistics, a smaller build side, or a non-broadcast join using plan and runtime evidence.

---

A Spark broadcast join timeout is not automatically a request to raise `spark.sql.broadcastTimeout`. The timeout says Spark did not finish the broadcast exchange within the allowed interval. The build-side query may be slow, the relation may be far larger than the optimizer believed, a manual hint may be forcing the wrong strategy, or the driver and network may be struggling to distribute an otherwise reasonable payload.

The right question is: **should this relation be broadcast at all?** Answer that before extending how long Spark waits.

## Confirm the Executed Join, Not the Intended Join

Inspect both the pre-execution plan and the completed adaptive plan:

```python
joined.explain(mode="cost")
joined.explain(mode="formatted")
```

`cost` prints logical-plan statistics when they are available. `formatted` separates the physical-plan outline from node details. Look for `BroadcastHashJoin` or `BroadcastNestedLoopJoin` and its `BroadcastExchange` child. In the SQL tab, inspect the final adaptive plan because Adaptive Query Execution (AQE) may change a planned sort-merge join to a broadcast join when runtime statistics make one side eligible.

Then establish why Spark chose it:

- a `broadcast()` call or `BROADCAST` SQL hint explicitly requested it;
- estimated relation size fell under `spark.sql.autoBroadcastJoinThreshold`;
- AQE used runtime size and its adaptive broadcast threshold;
- the join shape required a broadcast nested-loop strategy rather than a hash equi-join.

Join hints are advisory within the strategies supported by the join type, but a broadcast hint is deliberately prioritized over several other join hints. A hint can request broadcast even when the relation's estimated size exceeds the automatic threshold. Search the query code and views before blaming automatic planning.

## Validate Statistics and the Build-Side Query

Stale or absent statistics can make a large relation look small. For catalog tables, Spark SQL's `ANALYZE TABLE` statement collects table statistics for the optimizer. `NOSCAN` collects size information without a full scan; column analysis collects column statistics as specified.

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

Statistics are inputs to planning, not promises about runtime size after every expression. A filter backed by weak statistics, an exploding projection, a union, or a Python UDF can make estimates inaccurate. Compare the estimated size with the BroadcastExchange runtime metrics in the SQL UI.

Also time the build side by itself with the same filters and projection. If it spends most of the timeout scanning files, evaluating a UDF, or waiting for an upstream exchange, increasing a network timeout addresses the symptom rather than the slow subquery.

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

Projection matters because every executor receives the broadcast relation. Remove unused wide strings, arrays, and nested payloads. Filter before the hint. If duplicate dimension keys are accidental, correct them according to a deterministic business rule before joining; duplicate build rows also multiply output.

Do not cache an oversized relation merely to make broadcast succeed. Cache storage and broadcast memory are different lifecycle decisions, and caching can add materialization and eviction pressure. Measure the build-side row count and encoded/runtime size rather than inferring safety from the source file size.

## Distinguish Four Root Causes

### Wrong strategy

Evidence: a manual hint, large runtime broadcast size, executor memory pressure, or repeated timeout after a complete build. Remove the broadcast hint and let Spark choose, lower/disable automatic broadcasting for the session while testing, or use a supported merge hint to evaluate a sort-merge plan.

```python
test_session = spark.newSession()
test_session.conf.set("spark.sql.autoBroadcastJoinThreshold", "-1")
```

Configuration is session-scoped here; ensure the DataFrames and query are created in the intended session. Disabling broadcast globally may hurt unrelated joins, so use a controlled comparison.

### Bad or stale statistics

Evidence: `EXPLAIN COST` reports a tiny estimate while runtime metrics show a much larger relation. Refresh table and relevant column statistics using the catalog's supported workflow, then re-plan the query. Confirm that the data source/catalog actually supplies the statistics Spark uses.

### Slow build-side computation

Evidence: the BroadcastExchange's child scan or transformation dominates time before distribution begins. Fix file listing, pruning, filters, UDFs, or upstream shuffles. Increasing only the broadcast timeout would allow the slow computation to continue without improving it.

### Appropriate broadcast, insufficient timeout

Evidence: the runtime relation is intentionally small, memory is healthy, distribution progresses, and normal variance makes the exchange finish just beyond the limit. In this narrower case, set a timeout based on observed high-percentile build-and-distribute duration plus a reasoned margin:

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

A sort-merge join pays to redistribute and sort both sides but avoids distributing a complete build relation to each executor. A broadcast join avoids that large-side shuffle when the build relation is genuinely small. The cheaper plan depends on actual filtered sizes, partitioning, cluster resources, and reuse—not the table's label as a “dimension.”

AQE can improve the decision when runtime sizes differ from static estimates, but it still needs a supported join shape and sensible thresholds. Inspect the final plan every time the behavior is surprising.

## Keep Timeout and Memory as Separate Guardrails

A longer broadcast timeout grants more time; it does not grant driver or executor memory. The build relation is materialized for the broadcast exchange and distributed to executors, so validate driver memory, executor memory, and concurrent broadcast activity independently. A relation that finishes building after ten minutes can still destabilize every executor once delivered.

Conversely, a timeout can occur with a small final payload when its child query is slow. Record both build duration and broadcast data size. Alert on each separately: duration catches regressions in scans and upstream transformations, while size protects the replication cost. This makes a future timeout review evidence-based instead of normalizing an ever-increasing global setting.

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

Treat a broadcast timeout as a plan-validation failure first. Find the executed join and the reason it was selected, compare estimated and runtime size, and isolate build-side time. Shrink the relation or correct statistics when possible; stop broadcasting when the payload or join shape is wrong. Raise the timeout only when evidence shows that a valid, bounded broadcast needs slightly more time under normal conditions.
