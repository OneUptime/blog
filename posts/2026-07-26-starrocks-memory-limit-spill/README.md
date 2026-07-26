# StarRocks Memory Limit Exceeded: How to Diagnose Joins, Aggregations, and Spill

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Memory Management, Query Profile, Spill to Disk, Query Tuning

Description: Diagnose a StarRocks memory-limit failure at the process, query, resource-group, and operator levels before rewriting joins, reducing aggregation state, or enabling spill.

---

`Memory limit exceeded` is a protection event, not a diagnosis. StarRocks can reject a query because it reached:

- the BE/CN process memory limit;
- the per-query `query_mem_limit` on one node;
- a resource-group memory limit;
- a big-query limit;
- memory pressure that cannot be reclaimed quickly enough.

The failing node and operator matter. A distributed query can use modest total memory yet fail because one skewed join partition builds a huge hash table on a single BE.

## Preserve the Failure Evidence

Record the complete error, query ID, StarRocks version, resource group, session variables, and incident time. Do not immediately rerun with an unlimited memory setting.

Inspect current limits:

```sql
SHOW VARIABLES LIKE 'query_mem_limit';
SHOW VARIABLES LIKE 'enable_spill';
SHOW VARIABLES LIKE 'spill_mode';
SHOW RESOURCE GROUPS ALL;
```

`query_mem_limit` is a per-query limit on **each BE node**, not a cluster-wide total. Its default is `0`, meaning no explicit session query limit; process and workload limits still apply.

The BE configuration `mem_limit` defaults to 90% of host memory in current documentation, with a soft limit at 80%. On a shared host, set a lower process budget. Do not raise it to 100% and leave no memory for the OS, allocator fragmentation, agents, or storage caches.

## Inspect Memory Trackers on the Failing Node

```text
http://<be-host>:<be-http-port>/mem_tracker
http://<be-host>:<be-http-port>/mem_tracker?type=query_pool&upper_level=3
http://<be-host>:<be-http-port>/memz
```

`mem_tracker` attributes StarRocks allocations. `/memz` shows tcmalloc's view, including memory in use and allocator freelists. Reserved allocator memory is not identical to active query memory, so compare both with process RSS and StarRocks metrics.

Check:

```bash
curl -s "http://<be-host>:<be-http-port>/metrics" | grep -i mem
```

If all nodes are close to the process limit, investigate concurrency and cluster capacity. If one node is high, suspect data skew, hot tablets, or an uneven plan.

## Retrieve the Query Profile

For repeatable diagnostics:

```sql
SET enable_profile = true;
-- Run the safe reproduction.
SELECT last_query_id();
SELECT get_query_profile('<query-id>')\G
```

Or use:

```sql
EXPLAIN ANALYZE
SELECT ...;
```

`EXPLAIN ANALYZE` executes the statement; use it only for a safe SELECT or controlled operation. For a cached profile:

```sql
ANALYZE PROFILE FROM '<query-id>';
```

Start with:

- `QueryPeakMemoryUsagePerNode`;
- `QuerySumMemoryUsage`;
- `QuerySpillBytes`;
- peak memory by operator;
- max/min rows and memory across instances.

Then find the dominant join, aggregate, sort, or exchange.

## Diagnose Hash Join Memory

A hash join builds an in-memory table from one input and probes it with the other. Inspect:

- build-side rows and bytes;
- `BuildHashTableTime`;
- `HashTableMemoryUsage`;
- join strategy;
- exchange bytes;
- estimated versus actual build cardinality;
- max/min probe rows by instance.

Fixes, in order:

1. filter and project the build side before the join;
2. refresh statistics if the optimizer estimated it incorrectly;
3. ensure compatible join-key types so equality and runtime filters work;
4. use a smaller table as the build/right side where plan semantics allow;
5. use colocate or bucket-shuffle distribution for stable large-large joins;
6. address heavy join-key values;
7. test spill if the remaining hash table legitimately exceeds memory.

A huge `BROADCAST` build duplicates memory on every participating node. A `[SHUFFLE]` or `[BROADCAST]` hint can test an alternative, but join hints disable reordering for the hinted join. Do not make a hint permanent without comparing the complete plan.

## Diagnose Aggregation Memory

Hash aggregation memory grows with the number and width of distinct group keys and the state of each aggregate.

Check:

- local aggregate input/output rows;
- global aggregate input/output rows;
- hash-table memory;
- `ExprComputeTime`;
- spill bytes/blocks;
- distribution skew.

Useful changes include:

- pre-filter rows;
- remove unnecessary grouping columns;
- replace wide string keys with compact dictionary/ID keys;
- pre-aggregate in a subquery or materialized view;
- align table sort keys for sorted streaming aggregation when appropriate;
- split one enormous multi-purpose query into staged, governed work.

If a local aggregate receives 100 million rows and emits 99 million, it has almost no pre-aggregation benefit. More memory may let it finish, but it does not fix the high-cardinality design.

## Diagnose Sort and Expression Memory

Large `ORDER BY`, window functions, and Top-N operations can retain rows or merge spilled runs. Push filters and `LIMIT` earlier where semantics permit, project only required columns, and avoid sorting wide payloads.

Spill cannot solve every OOM. StarRocks specifically notes that expression-evaluation memory is not generally reclaimed through spilling. If expression compute or materialization dominates, simplify expressions, use generated columns, or reduce row/column width earlier.

## Enable Spill as a Stability Trade-off

StarRocks supports spilling intermediate results from v3.0.1. Current support includes aggregate, sort, hash-join operators, and CTE operators from v3.3.4.

Configure dedicated local scratch paths in each BE/CN configuration:

```ini
spill_local_storage_dir=/mnt/spill1;/mnt/spill2
```

Restart as required, then enable for the session:

```sql
SET enable_spill = true;
SET spill_mode = 'auto';
```

Use separate, fast disks from primary data storage when possible. Spill creates substantial writes and consumes space shared by concurrent queries.

`auto` spills when thresholds are reached. `force` makes relevant operators spill regardless of current memory:

```sql
SET spill_mode = 'force';
```

Use `force` for testing the spill path, not as a default performance setting.

StarRocks documents important limitations:

- spilling is a beta feature;
- not all OOMs are spillable;
- a spilling query can be about ten times slower;
- local spill directories are shared and have no per-query spill-size limit;
- object-storage spill, available from v3.3, is slower than local spill.

Monitor `QuerySpillBytes`, operator spill metrics, disk free space, IOPS, and query timeout. Spilled data is normally deleted after the query and cleaned on BE restart after a crash, but disk alerts remain essential.

## Set a Query Limit Deliberately

For a controlled session:

```sql
SET query_mem_limit = 8589934592;
```

That is 8 GiB per BE. Raising it helps only if the process and resource group have corresponding headroom and concurrency remains safe. Reducing it with spill can make large queries coexist more predictably at a latency cost.

For multi-tenant clusters, resource groups can combine:

- `mem_limit`;
- `concurrency_limit`;
- `big_query_mem_limit`;
- `spill_mem_limit_threshold`.

With automatic spilling and no resource groups, current documentation says spilling occurs when a query exceeds 80% of `query_mem_limit`. With resource groups, group pressure can also trigger it. Test the exact release and observe actual profile spill counters.

## Protect the Cluster from Concurrent Peaks

One 20 GiB query may fit; ten may not. Use resource groups and query queues to govern admission rather than relying on OOM termination.

Validate under production concurrency:

```text
per-query peak × expected concurrent queries
+ load/compaction/cache/metadata memory
< safe BE process budget
```

This is a conservative capacity model because peaks and distribution are uneven. Include a safety margin and alert before the hard process limit.

The resolution order is: identify the limit, find the node and operator, reduce rows/state/skew, correct the plan and table layout, then use spill or a higher limit within a governed memory budget.

## Official Documentation

- [StarRocks memory management](https://docs.starrocks.io/docs/administration/management/resource_management/Memory_management/)
- [StarRocks spill to disk](https://docs.starrocks.io/docs/administration/management/resource_management/spill_to_disk/)
- [StarRocks resource groups](https://docs.starrocks.io/docs/administration/management/resource_management/resource_group/)
- [Query Profile metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)
- [Query Profile tuning recipes](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_tuning_recipes/)
- [StarRocks system variables](https://docs.starrocks.io/docs/sql-reference/System_variable/)
