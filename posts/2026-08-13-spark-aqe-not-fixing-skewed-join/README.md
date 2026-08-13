# Why Spark AQE Is Not Fixing Your Skewed Join

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Adaptive Query Execution, Data Skew, Spark SQL, Joins, Performance Tuning

Description: Verify Spark AQE skew-join eligibility, final adaptive plans, runtime partition thresholds, join strategy, and semantic fanout before changing skew settings.

---

Adaptive Query Execution (AQE) does not promise to fix every long join task. Spark's skew-join optimization targets qualifying partitions of a sort-merge join. It uses runtime shuffle statistics and considers a partition skewed only when configured relative and absolute conditions are satisfied. A broadcast join, nonqualifying join shape, stale assumption about the final plan, or a many-to-many output explosion may leave AQE with nothing applicable to split.

Diagnose eligibility in order. Do not start by lowering every threshold.

## Confirm AQE and Skew Optimization Are Active

Read the effective session settings:

```python
for key in [
    "spark.sql.adaptive.enabled",
    "spark.sql.adaptive.skewJoin.enabled",
    "spark.sql.adaptive.skewJoin.skewedPartitionFactor",
    "spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes",
    "spark.sql.adaptive.advisoryPartitionSizeInBytes",
]:
    print(key, spark.conf.get(key))
```

AQE's umbrella setting and skew-join setting must both be enabled. Inspect them in the same Spark session that creates and executes the query. Settings applied after a query is already running cannot change that execution.

Next, force a complete action and inspect the SQL tab's final adaptive plan. A pre-action `explain()` may show an initial plan. The executed UI should reveal whether the adaptive plan is final and whether skewed shuffle readers/partitions were introduced.

## Verify the Join Strategy Is Eligible

The official performance guide describes skew optimization for sort-merge joins. Find the join node in the final plan. If it is `BroadcastHashJoin`, `ShuffledHashJoin`, `BroadcastNestedLoopJoin`, or another strategy, do not expect the sort-merge skew rule to appear.

A manual join hint may drive strategy selection. Automatic broadcast thresholds or AQE can also convert a sort-merge plan to broadcast when one side is small enough. Hints are not guaranteed for unsupported combinations, but they are important evidence.

For diagnosis, remove unnecessary hints and compare supported alternatives on representative data. Do not force sort-merge merely to make a skew rule fire unless the end-to-end plan is better.

## Understand the Two-Part Skew Test

Spark's skew-join configuration uses both:

- a partition-size factor relative to the median partition size; and
- an absolute partition-size threshold.

A partition must exceed the rule's required conditions, not just look large next to a tiny partition in a screenshot. This avoids treating modest partitions as operationally significant skew merely because the median is small.

Read actual shuffle partition sizes from SQL/stage metrics. If a 180 MiB partition is ten times the median but the configured absolute threshold is 256 MiB, it does not qualify under that example configuration. If a 600 MiB partition is only twice a 350 MiB median while the factor is five, it also does not qualify. These numbers illustrate the logic, not current defaults.

Set the absolute threshold in relation to `spark.sql.adaptive.advisoryPartitionSizeInBytes`, as the official guide recommends, and change one setting at a time. Overly aggressive thresholds can add splitting, replication, and shuffle work to partitions that were not the bottleneck.

## Check Whether Statistics Exist at the Right Boundary

AQE makes decisions after shuffle map-output statistics become available. If the apparent skew is before a shuffle that AQE cannot rewrite, or inside a user-defined operation after the join, the skew-join rule may not address it.

Cross-reference the slow stage with the SQL plan's exchange IDs. Confirm the outlier task is reading a skewed join shuffle partition, not:

- a large unsplittable input file;
- a skewed aggregation after the join;
- an `applyInPandas()` group;
- slow remote shuffle fetches;
- one executor experiencing GC or disk trouble;
- a sink task writing an unusually large output partition.

Task duration alone is not data-skew evidence. Compare shuffle read bytes/records, CPU time, GC, spill, and fetch wait with peers.

## Distinguish Partition Skew from Join Fanout

For an equi-join, a key with `L` left rows and `R` right rows creates `L × R` matches. AQE can split qualifying skewed sort-merge work and replicate the necessary matching data, improving parallelism. It cannot remove those logically required output rows.

Profile key multiplicity on both sides:

```python
from pyspark.sql import functions as F

left_counts = left.groupBy("join_key").count().withColumnRenamed("count", "l")
right_counts = right.groupBy("join_key").count().withColumnRenamed("count", "r")

(
    left_counts.join(right_counts, "join_key")
    .withColumn("matches", F.col("l") * F.col("r"))
    .orderBy(F.desc("matches"))
    .show(30, truncate=False)
)
```

If fanout is accidental, correct uniqueness, complete the predicate, aggregate first, or use a semi join. Tuning AQE to process the wrong result faster preserves the data bug.

## Look for Unsplittable Key Semantics

Even outside join fanout, one key may dominate because a sentinel such as `"UNKNOWN"` collapses unrelated entities. Standard SQL equality does not match nulls to nulls, but explicit null-safe equality or prior null replacement can create a hot group. Review key normalization and null policy.

Salting is a semantic transformation, not a generic toggle. It can distribute a hot key when the join or later aggregation can be reconstructed correctly. For a large-side/small-side equi-join, salting the large side and replicating corresponding small-side rows is a known pattern, but it increases data and must preserve output exactly. Prefer built-in AQE when eligible and proven effective; use manual salting only with tests and bounded replication.

## Evaluate Force and Threshold Settings Carefully

Spark exposes `spark.sql.adaptive.forceOptimizeSkewedJoin` to allow skew optimization even when it introduces an extra shuffle. That trade-off can help a severe long tail or hurt a workload where the extra exchange costs more than the skew.

Run A/B tests with the same input snapshot and capture:

- initial and final physical plans;
- number of skewed partitions/splits shown by the plan and metrics;
- maximum and median task duration;
- shuffle bytes, fetch wait, and spill;
- output row count and correctness checks;
- total runtime and resource consumption.

Avoid reporting only the slowest task. Splitting it into ten tasks is not a win if an added shuffle makes the full query slower.

## A Reliable Diagnostic Order

1. Prove the slow task corresponds to join-shuffle skew.
2. Confirm effective AQE/skew settings in the executing session.
3. Inspect the completed final adaptive plan.
4. Verify a qualifying sort-merge join strategy.
5. Compare actual partition sizes with both skew conditions.
6. Calculate per-key fanout and validate the join contract.
7. Test one threshold, hint, or semantic correction at a time.
8. Compare full-query cost and output correctness.

## Official Documentation

- [Spark SQL Performance Tuning: Adaptive Query Execution](https://spark.apache.org/docs/latest/sql-performance-tuning.html#adaptive-query-execution)
- [Spark SQL Performance Tuning: Optimizing Skew Join](https://spark.apache.org/docs/latest/sql-performance-tuning.html#optimizing-skew-join)
- [Spark SQL Performance Tuning: Join Hints](https://spark.apache.org/docs/latest/sql-performance-tuning.html#join-strategy-hints-for-sql-queries)
- [Spark SQL Join Syntax](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html)
- [Spark SQL Null Semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html)
- [PySpark DataFrame `explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)
- [Spark Web UI: SQL and Stage Details](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark Monitoring and Instrumentation](https://spark.apache.org/docs/latest/monitoring.html)

## Conclusion

AQE skew handling is conditional, not universal. Confirm the final executed plan, a supported sort-merge join, runtime partition statistics, and both skew thresholds. Then separate execution skew from incorrect many-to-many fanout or an outlier elsewhere in the DAG. Tune thresholds or force an extra shuffle only when end-to-end evidence supports it; repair the join semantics when the output itself is the problem.
