# StarRocks Query Is Slow: How to Read EXPLAIN ANALYZE and Query Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Query Tuning, EXPLAIN ANALYZE, Query Profile, SQL

Description: Diagnose a slow StarRocks query by separating plan estimates from runtime evidence and following scan, join, exchange, aggregation, memory, and skew metrics.

---

StarRocks exposes two different kinds of evidence:

- `EXPLAIN` shows the plan selected before execution, including estimates and distribution decisions.
- `EXPLAIN ANALYZE` executes the statement and returns a query profile with actual operator behavior.

Use both. A plan can look sensible but run badly because statistics are wrong, one node receives skewed data, a build-side hash table is much larger than estimated, or storage is slow. Conversely, a slow operator in a profile may be downstream of the real cause, such as a scan that failed to prune.

`EXPLAIN ANALYZE` is supported from StarRocks v3.1. It really runs the query. SELECT results are discarded; an analyzed `INSERT INTO` transaction is aborted by default. Still use a production-safe account and statement, because execution consumes cluster resources.

## Capture a Reproducible Query

Record:

- the exact SQL and session variables;
- parameter values and catalog/database;
- query ID, start time, and StarRocks version;
- concurrent workload and resource group;
- the expected and actual runtime.

First inspect the non-executing plan:

```sql
EXPLAIN COSTS
SELECT customer_id, SUM(amount)
FROM sales.orders
WHERE order_date >= '2026-07-01'
  AND order_date <  '2026-08-01'
GROUP BY customer_id;
```

From v3.3.5, `COSTS` is the default detail level. `EXPLAIN VERBOSE` is useful for data types, distribution, runtime filters, and fragment details. Read the plan bottom-up: scans feed joins and aggregations, and exchanges connect fragments.

Look for:

- `partitionsRatio`/`partitions` and `tabletRatio`;
- pushed `PREDICATES`;
- estimated `cardinality`;
- `BROADCAST`, `SHUFFLE`, `BUCKET_SHUFFLE`, or colocate join;
- local and global aggregation stages;
- `EXCHANGE` nodes that move or gather data;
- selected rollup or materialized view.

## Run EXPLAIN ANALYZE in a Controlled Window

```sql
EXPLAIN ANALYZE
SELECT customer_id, SUM(amount)
FROM sales.orders
WHERE order_date >= '2026-07-01'
  AND order_date <  '2026-08-01'
GROUP BY customer_id;
```

Do not begin by increasing memory or forcing a join. First identify the fragment and operator that dominates elapsed time, CPU, memory, or network.

A profile is hierarchical:

```text
Query
└── Fragment
    └── Pipeline
        └── Operator
```

Operator time can be cumulative across parallel drivers, so it can exceed wall-clock time. Compare `QueryExecutionWallTime`, `QueryCumulativeCpuTime`, and operator percentages rather than adding every duration as if the operators ran serially.

## Start with the Query Summary

Check:

- `QueryExecutionWallTime`: user-visible execution time;
- `QueryCumulativeCpuTime`: CPU consumed across workers;
- `QueryPeakMemoryUsagePerNode`: worst per-node peak;
- `QueryCumulativeNetworkTime`: time attributed to exchanges;
- `QueryCumulativeScanTime`: scan I/O contribution;
- `QueryPeakScheduleTime`: scheduling delay;
- `QuerySpillBytes`: intermediate data written to spill storage.

Interpret the shape:

| Signal | Likely direction |
| --- | --- |
| CPU time dominates | expression, join, aggregation, or decompression work |
| Wall time high but CPU modest | I/O, network, queueing, lock, or one slow driver |
| Peak memory near a limit | hash join, high-cardinality aggregate, sort, or CTE |
| Large spill bytes | memory pressure was converted to disk I/O |
| High schedule time | workload concurrency or insufficient executor capacity |

Then move to the operator that explains the summary.

## Read Scan Operators First

For an `OlapScan` operator, compare:

- partitions and tablets selected;
- rows read versus rows returned;
- bytes read, I/O time, and decompression time;
- predicate pushdown and runtime-filter input/output;
- segment and page filtering;
- local versus remote read metrics in shared-data deployments.

If almost every partition or tablet is scanned, fix pruning or table layout before tuning the later aggregation. If many rows are read and very few survive, inspect sort keys, indexes, predicate types, and whether a function or cast prevented pushdown.

For shared-data clusters, high remote read bytes and `IOTimeRemote` can identify a cold cache or object-storage bottleneck. That is different from a CPU-heavy scan.

## Diagnose Joins from Build and Probe

Identify the selected strategy in the plan:

- **Broadcast:** send a small build side to every probe node.
- **Shuffle:** hash-partition both sides by join keys.
- **Bucket shuffle:** shuffle one side to the other table's bucket layout.
- **Colocate:** join matching buckets locally.

In the runtime profile, inspect build/probe rows, hash-table memory, build time, probe time, runtime filters, exchange bytes, and the max/min distribution across instances.

Common patterns:

- huge build memory plus `BROADCAST`: the estimated-small side was not small;
- high exchange bytes: a shuffle dominates;
- one instance with far more probe rows/time: join-key skew;
- scan rows remain high despite a selective join: runtime filters did not propagate;
- estimated rows differ greatly from actual rows: statistics need investigation.

Hints such as `[BROADCAST]` and `[SHUFFLE]` disable join reordering for the hinted join. Use them to prove a hypothesis, not as the first fix. Refresh relevant statistics and repair table distribution before permanently pinning a plan.

## Diagnose Aggregation and Sort

For aggregation, compare input and output rows. A local aggregate that turns hundreds of millions of rows into thousands before exchange is valuable. If input and output are almost equal, the group key has high cardinality and the hash table can be large.

Look at:

- aggregate hash-table memory;
- input/output row counts at local and global stages;
- expression compute time for complex group keys;
- spill blocks and bytes;
- max/min rows and time across drivers.

For sort or Top-N:

- confirm `LIMIT` is pushed into partial Top-N stages;
- inspect sort rows, memory, merge time, and spill;
- avoid sorting columns that are not needed in the final result;
- consider table sort keys or a materialized view for stable repeated patterns.

## Diagnose Exchanges and Skew

`EXCHANGE` is where fragments transfer data. High network time can be expected for a large shuffle, but large differences between instance row counts reveal imbalance.

Profile metrics are aggregated by default (`pipeline_profile_level=1`). If merged metrics hide an outlier, use level 2 for a focused diagnostic:

```sql
SET pipeline_profile_level = 2;
```

Level 2 retains the original structure and produces much larger profiles; do not leave it enabled globally.

Data skew typically appears as one driver with much larger input rows, peak memory, or operator time while peers finish early. Confirm the heavy key values in SQL before changing bucketing or adding a skew hint.

## Retrieve Profiles for Existing Queries

For a session:

```sql
SET enable_profile = true;

SELECT COUNT(*) FROM information_schema.columns;
SELECT last_query_id();
SHOW PROFILELIST;

SELECT get_query_profile('<query-id>')\G
```

Profiles are also available from the FE web UI. Global profiling adds overhead, so StarRocks recommends not leaving it globally enabled for long production periods. Capture only slow queries with:

```sql
SET GLOBAL big_query_profile_threshold = '30s';
```

Runtime Query Profile is available from v3.1 and reports long-running query progress periodically. The default interval is 10 seconds:

```sql
SET runtime_profile_report_interval = 30;
```

For a cached profile, use the tree-oriented analyzer:

```sql
ANALYZE PROFILE FROM '<query-id>';
ANALYZE PROFILE FROM '<query-id>', 0;
```

The second form expands the selected plan node's metrics.

## Turn Evidence into One Change

Use a short decision sequence:

1. Did scans prune partitions, tablets, segments, and rows?
2. Were estimates close enough to actual cardinalities?
3. Is join strategy correct for actual side sizes and distribution?
4. Is one instance doing disproportionately more work?
5. Is memory dominated by join, aggregation, sort, or expressions?
6. Did spill keep the query alive at an unacceptable latency cost?
7. Is network or remote storage the bottleneck?

Make one change—statistics, predicate, schema distribution, sort key, materialized view, join strategy, memory/spill policy, or resource isolation—then compare the same query and load. Keep the before/after query IDs and profiles.

The fastest path through a profile is not to read every counter. Start at the summary, find the dominant fragment/operator, and use its rows, time, memory, and distribution to trace the bottleneck back toward the scans.

## Official Documentation

- [StarRocks EXPLAIN ANALYZE](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN_ANALYZE/)
- [StarRocks EXPLAIN](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN/)
- [Query Profile overview](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_overview/)
- [Query Profile metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)
- [Query Profile tuning recipes](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_tuning_recipes/)
- [ANALYZE PROFILE](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/ANALYZE_PROFILE/)
