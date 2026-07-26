# How to Tune StarRocks for High-Concurrency BI Dashboards with Resource Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Resource Groups, Business Intelligence, Query Concurrency, Query Queue, Performance

Description: Isolate dashboard traffic in StarRocks, route it reliably, control admission, and tune CPU and memory from measured latency.

---

BI dashboards create a distinctive workload: many small queries arrive together when a page refreshes, while background analysts and data loads may already be consuming the cluster. The goal is not to make every dashboard query highest priority. It is to keep predictable interactive capacity and queue bursts before they turn into CPU saturation, memory pressure, and cascading timeouts.

StarRocks resource groups provide two separate controls:

- classifiers decide which group receives a query;
- limits and scheduling weights decide how that group competes for resources.

A perfectly tuned group does nothing if dashboard sessions do not match its classifier. Start with identity and routing, then tune capacity.

## Give Dashboard Traffic a Stable Identity

Use a dedicated StarRocks user or role for the BI service account. Source IP and database classifiers are useful additions, but they are often brittle behind connection pools, proxies, and cross-database queries.

The following example creates a shared group:

```sql
CREATE RESOURCE GROUP dashboard_bi
TO (
  user = 'dashboard_reader',
  query_type IN ('select')
)
WITH (
  'cpu_weight' = '16',
  'mem_limit' = '30%',
  'concurrency_limit' = '24',
  'big_query_cpu_second_limit' = '120',
  'big_query_scan_rows_limit' = '500000000',
  'big_query_mem_limit' = '4294967296'
);
```

These values are examples, not defaults. `mem_limit` is a percentage of query memory on each BE, and `cpu_weight` is a relative scheduling weight on each BE. Neither value reserves that percentage of the entire cluster for a dashboard.

Create a separate group for ad hoc users instead of adding broad classifiers to the dashboard group:

```sql
CREATE RESOURCE GROUP analyst_adhoc
TO (
  role = 'analyst',
  query_type IN ('select')
)
WITH (
  'cpu_weight' = '8',
  'mem_limit' = '40%',
  'concurrency_limit' = '8'
);
```

When more than one classifier matches, StarRocks uses its classifier matching weight. Inspect the chosen group rather than relying on classifier order.

## Prove the Classifier Before Load Testing

Connect through the same driver, user, role activation, proxy, and database context as the dashboard. Then run:

```sql
EXPLAIN VERBOSE
SELECT count(*)
FROM analytics.fact_orders
WHERE order_date = CURRENT_DATE();
```

The result contains a `RESOURCE GROUP` field for a query that has not run yet. For active queries, inspect:

```sql
SHOW PROC '/current_queries';
SHOW PROC '/global_current_queries';
```

The `ResourceGroup` field shows the actual match. After completion, the FE audit log records `ResourceGroup`. An empty value means resource-group management did not apply; `default_wg` means management applied but no user-defined classifier matched.

If a connection pool reuses sessions for several tenants, routing by `user` may be too coarse. Use separate credentials or roles, or set a group explicitly for the session:

```sql
SET resource_group = 'dashboard_bi';
```

Explicit session selection is useful for controlled applications, but it should not become a way for arbitrary users to bypass governance.

## Choose Shared or Exclusive CPU Intentionally

A shared group uses `cpu_weight`. Under contention, its value determines the relative CPU-time share. When other groups are idle, a shared group can use available capacity. Doubling one group's weight does not guarantee twice the query throughput because scans, memory, network, and storage can still dominate.

From StarRocks 3.3.5, an exclusive group can use `exclusive_cpu_cores` for hard CPU isolation:

```sql
CREATE RESOURCE GROUP dashboard_isolated
TO (user = 'dashboard_reader', query_type IN ('select'))
WITH (
  'exclusive_cpu_cores' = '8',
  'mem_limit' = '30%'
);
```

Only one of `cpu_weight` and `exclusive_cpu_cores` can be greater than zero. An exclusive group remains quota-limited to its reserved cores. By default, the BE setting `enable_resource_group_cpu_borrowing=true` allows shared groups to borrow exclusive cores while their owner is idle; set it to `false` if those idle cores must remain unavailable. Begin with a shared group unless a measured noisy-neighbor problem justifies dedicated cores.

StarRocks 4.1 adds percentage-based CPU controls, including `cpu_weight_percent` and `exclusive_cpu_percent`. Use the syntax and valid combinations documented for the deployed minor version; do not mix the older core-count and newer percentage controls by guesswork.

## Queue the Burst Instead of Running Everything

`concurrency_limit` is an admission boundary, not a target. A useful starting value is the number of concurrent dashboard queries the cluster can run while meeting the latency objective, not the number a connection pool can open.

For Query Queue v1, resource-group-level queuing is available from 3.1.4. Enable SELECT queues and group-level queues:

```sql
SET GLOBAL enable_query_queue_select = true;
SET GLOBAL enable_group_level_query_queue = true;
```

With v1, `concurrency_limit` and the deprecated-compatible `max_cpu_cores` can trigger a group queue. Bound how long callers can wait:

```sql
SET GLOBAL query_queue_pending_timeout_second = 15;
SET GLOBAL query_queue_max_queued_queries = 2000;
```

Align the dashboard HTTP timeout, database driver's query timeout, StarRocks pending timeout, and retry policy. If the web request gives up after five seconds while StarRocks queues for 300 seconds, abandoned work can continue to occupy the queue.

Query Queue v2, available from 3.3 and enabled by default from 4.1, uses estimated logical slots instead of the v1 fixed CPU, memory, and concurrency triggers. When v2 is active, v1 variables such as `query_queue_concurrency_limit`, `query_queue_mem_used_pct_limit`, and `query_queue_cpu_used_permille_limit` do not trigger admission. Check `enable_query_queue_v2` on every FE and tune v2's `query_queue_v2_concurrency_level` from load-test results. It is a relative logical-concurrency setting, not a count of dashboard queries.

Do not combine snippets from the two queue versions without checking which scheduler is active.

## Set Memory and Big-Query Guards from Profiles

`mem_limit` bounds the group's query memory as a percentage of memory available on each BE. It is neither a reservation nor a cluster-wide byte total. Too low a value causes spilling or failures; too high a value allows a burst to crowd other workloads.

Profile representative dashboard tiles and record:

- peak operator memory per BE;
- scan rows and bytes;
- CPU time;
- spill bytes and time;
- end-to-end and queued latency.

The `big_query_cpu_second_limit`, `big_query_scan_rows_limit`, and `big_query_mem_limit` controls stop a single request from exhausting the group. Set them above legitimate worst-case dashboard queries with headroom. A scan-row limit copied from a small development table can terminate every production refresh.

Optimize repeated dashboard SQL before allocating more resources. Useful fixes include materialized-view rewrite, partition pruning, current statistics, bounded time windows, and reducing the number of nearly identical tile queries.

## Measure Under a Real Refresh Pattern

A serial benchmark misses dashboard fan-out. Replay the actual number of tiles, users, refresh intervals, parameter distributions, and connection-pool limits. Include competing ad hoc and loading work.

Observe:

```sql
SHOW RESOURCE GROUP dashboard_bi;
SHOW USAGE RESOURCE GROUPS;
SHOW RUNNING QUERIES;
SHOW PROCESSLIST;
```

`SHOW USAGE RESOURCE GROUPS` reports approximate CPU, memory, and running-query usage by BE. `SHOW RUNNING QUERIES` distinguishes `PENDING` from `RUNNING` and shows requested slots when Query Queue v2 is active.

Alert on:

- p95 and p99 resource-group latency;
- queue pending count, wait time, timeouts, and rejection;
- running queries and CPU by group;
- group memory versus its limit;
- spill volume and big-query-limit activations;
- dashboard request cancellations and retries.

FE metrics include `starrocks_fe_query_resource_group_latency` and per-group queue counters. The audit field `PendingTimeMs` separates queue delay from execution delay.

## Tune One Constraint at a Time

Use a controlled loop:

1. Verify every test query routes to the intended group.
2. Optimize the slowest repeated query shapes.
3. Increase concurrency until p95 execution time begins to degrade.
4. Set admission slightly below the collapse point.
5. Adjust shared CPU weight if another group wins during contention.
6. Increase memory only when profiles show avoidable spill and sufficient BE headroom.
7. Repeat with the real mixed workload.

If queue time is high but execution time remains stable, more capacity or fewer dashboard requests may help. If execution time rises sharply with concurrency, admitting more queries will make the dashboard slower.

## Version and Safety Notes

- Resource groups require Pipeline Engine. Pipeline Engine and resource groups are enabled by default from 3.1, but older clusters need their documented session settings.
- The old `short_query` type was deprecated and converted to exclusive resource groups from 3.3.5.
- Query Queue v1 group-level queuing begins in 3.1.4.
- Query Queue v2 begins in 3.3 and defaults to enabled from 4.1; changing `enable_query_queue_v2` requires FE restart.
- Resource limits apply per BE where documented. Validate behavior on heterogeneous clusters.
- Roll out classifier and limit changes to a canary service account first. A broad classifier can move unrelated production queries.

## Official Documentation

- [StarRocks resource groups](https://docs.starrocks.io/docs/administration/management/resource_management/resource_group/)
- [CREATE RESOURCE GROUP](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/resource_group/CREATE_RESOURCE_GROUP/)
- [StarRocks query queues](https://docs.starrocks.io/docs/administration/management/resource_management/query_queues/)
- [SHOW USAGE RESOURCE GROUPS](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/resource_group/SHOW_USAGE_RESOURCE_GROUPS/)
- [StarRocks FE query and loading parameters](https://docs.starrocks.io/docs/administration/management/FE_parameters/user_query_loading/)
