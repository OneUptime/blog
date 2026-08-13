# Why Spark AQE Is Not Fixing Your Skewed Join

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Adaptive Query Execution, Data Skew, Spark SQL, Joins, Performance Tuning

Description: Verify Spark AQE skew-join eligibility, final adaptive plans, runtime partition thresholds, join strategy, and semantic fanout before changing skew settings.

---

Adaptive Query Execution (AQE) does not promise to fix every long join task. Spark's skew-join optimization targets qualifying shuffled partitions in supported join plans. It uses runtime shuffle statistics and considers a partition skewed only when configured relative and absolute conditions are satisfied. A join with no qualifying shuffled side or supported shape, a stale assumption about the final plan, or a many-to-many output explosion may leave AQE with nothing applicable to split.

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

AQE's umbrella setting and skew-join setting must both be enabled. Inspect them in the same Spark session that creates and executes the query. Set them before starting the action; changing settings during an execution is timing-dependent and is not a reliable way to retune that query.

Next, force a complete action and inspect the SQL tab's final adaptive plan. A pre-action `explain()` may show an initial plan. The executed UI should reveal whether the adaptive plan is final and whether skewed shuffle readers/partitions were introduced.

## Verify the Join Strategy Is Eligible

The official performance guide describes skew optimization for sort-merge joins, but implementation support depends on the Spark version. Spark 3.2 and later also apply `OptimizeSkewedJoin` to qualifying shuffled-hash joins. Spark 4.2 can additionally split the shuffled streamed side of a broadcast-hash join when `spark.sql.adaptive.localShuffleReader.enabled` is `false`. `BroadcastNestedLoopJoin`, full outer joins, and other unsupported join types or shapes are not handled. For outer, semi, and anti joins, only semantics-preserving sides can be split. Check the final join node against the behavior of your deployed Spark version.

A manual join hint may drive strategy selection. Automatic broadcast thresholds or AQE can also convert a sort-merge plan to broadcast when one side is small enough. Hints are not guaranteed for unsupported combinations, but they are important evidence.

For diagnosis, remove unnecessary hints and compare supported alternatives on representative data. Do not force a particular join strategy merely to make skew optimization fire unless the end-to-end plan is better.

## Understand the Two-Part Skew Test

Spark's skew-join configuration uses both:

- a partition-size factor relative to the median partition size; and
- an absolute partition-size threshold.

A partition must exceed the rule's required conditions, not just look large next to a tiny partition in a screenshot. This avoids treating modest partitions as operationally significant skew merely because the median is small.

Read actual shuffle partition sizes from SQL/stage metrics. If a 180 MiB partition is ten times the median but the configured absolute threshold is 256 MiB, it does not qualify under that example configuration. If a 600 MiB partition is less than twice a 350 MiB median while the factor is five, it also does not qualify. These numbers illustrate the logic, not current defaults.

Set the absolute threshold in relation to `spark.sql.adaptive.advisoryPartitionSizeInBytes`, as the official guide recommends, and change one setting at a time. Overly aggressive thresholds can add splitting, replication, and shuffle work to partitions that were not the bottleneck.

## Check Whether Statistics Exist at the Right Boundary

AQE makes decisions after shuffle map-output statistics become available. If the apparent skew is before a shuffle that AQE cannot rewrite, or inside a user-defined operation after the join, the skew-join rule may not address it.

Cross-reference the slow stage with its associated SQL query and the plan's `Exchange` or `AQEShuffleRead` nodes and metrics. Confirm the outlier task is reading a skewed join shuffle partition, not:

- a large unsplittable input file;
- a skewed aggregation after the join;
- an `applyInPandas()` group;
- slow remote shuffle fetches;
- one executor experiencing GC or disk trouble;
- a sink task writing an unusually large output partition.

Task duration alone is not data-skew evidence. Compare shuffle read bytes/records, CPU time, GC, spill, and fetch wait with peers.

## Distinguish Partition Skew from Join Fanout

For an inner equi-join, a matching key with `L` left rows and `R` right rows creates `L × R` matches. AQE can split qualifying skewed join-shuffle work and replicate the necessary matching data, improving parallelism. It cannot remove those logically required output rows.

Profile key multiplicity on both sides:

```python
from pyspark.sql import functions as F

left_counts = left.groupBy("join_key").count().withColumnRenamed("count", "l")
right_counts = right.groupBy("join_key").count().withColumnRenamed("count", "r")

(
    left_counts.join(right_counts, "join_key")
    .withColumn(
        "matches",
        F.col("l").cast("decimal(38,0)") * F.col("r").cast("decimal(38,0)"),
    )
    .orderBy(F.desc("matches"))
    .show(30, truncate=False)
)
```

Use the same normalized key expression and null semantics as the production join. This example mirrors ordinary equality, so its inner join excludes the grouped null bucket.

If fanout is accidental, correct uniqueness, complete the predicate, aggregate first, or use a semi join when only the existence of a matching right row is required. Tuning AQE to process the wrong result faster preserves the data bug.

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
4. Verify an eligible join strategy, join type, and shuffle shape for your Spark version.
5. Compare actual partition sizes with both skew conditions.
6. Calculate per-key fanout and validate the join contract.
7. Test one threshold, hint, or semantic correction at a time.
8. Compare full-query cost and output correctness.

Also distinguish skew splitting from AQE's post-shuffle coalescing. Coalescing combines contiguous shuffle partitions according to its adaptive target-size logic; when `spark.sql.adaptive.coalescePartitions.parallelismFirst` is `true`, Spark derives the target from cluster parallelism rather than respecting the advisory size. Skew optimization splits qualifying large join-shuffle partitions. An aggressive initial partition count followed by coalescing can be healthy, while an initial count that is too small leaves broadly oversized partitions that are not necessarily “skewed” relative to their median. Read both adaptive rules in the final plan before crediting or blaming one setting.

## Official Documentation

- [Spark SQL Performance Tuning: Adaptive Query Execution](https://spark.apache.org/docs/latest/sql-performance-tuning.html#adaptive-query-execution)
- [Spark SQL Performance Tuning: Optimizing Skew Join](https://spark.apache.org/docs/latest/sql-performance-tuning.html#optimizing-skew-join)
- [Spark SQL Performance Tuning: Join Hints](https://spark.apache.org/docs/latest/sql-performance-tuning.html#join-strategy-hints)
- [Spark SQL Join Syntax](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html)
- [Spark SQL Null Semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html)
- [PySpark DataFrame `explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)
- [Spark Web UI: SQL and Stage Details](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark Monitoring and Instrumentation](https://spark.apache.org/docs/latest/monitoring.html)

## Conclusion

AQE skew handling is conditional, not universal. Confirm the final executed plan, an eligible join strategy and shape for your Spark version, runtime partition statistics, and both skew thresholds. Then separate execution skew from incorrect many-to-many fanout or an outlier elsewhere in the DAG. Tune thresholds or force an extra shuffle only when end-to-end evidence supports it; repair the join semantics when the output itself is the problem.
