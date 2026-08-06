# Diagnose High ODBC Latency in Databricks SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, ODBC, Serverless SQL, Query Performance, Latency Monitoring

Description: Isolate Databricks ODBC latency across connection, warehouse startup, queueing, compilation, execution, result fetching, caching, and client rendering.

---

An ODBC client reports one elapsed time, but a Databricks SQL request crosses several boundaries. DNS, TLS, proxy, and OAuth happen before Databricks receives the SQL statement. The warehouse may need to start or may queue the statement. Databricks then compiles and executes it, and the driver fetches result blocks before the client renders them.

Changing warehouse size or fetch settings before identifying the slow phase can make the system more expensive without improving user latency.

## Build a latency budget

Measure these timestamps in the client:

```text
t0  start connection
t1  connection authenticated
t2  statement submitted
t3  first row available
t4  all rows fetched
t5  client transformation or visualization complete
```

The differences isolate client-visible phases:

```text
connection latency = t1 - t0
submit-to-first-row = t3 - t2
client fetch latency = t4 - t3
client processing latency = t5 - t4
```

Databricks query history decomposes server-side time. `total_duration_ms` excludes result fetch time, while `result_fetch_duration_ms` records fetching after execution. `waiting_for_compute_duration_ms` measures provisioning wait, and `waiting_at_capacity_duration_ms` measures queueing for available capacity.

The client timer will be longer than the sum of server fields because connection setup, network round trips, driver work, and application rendering are outside parts of the server measurement.

## Start with query history

Open Query History, filter to the warehouse, user, client, time, or statement ID, and inspect the wall-clock breakdown. The `system.query.history` table supports repeatable analysis and includes the driver and client application where reported.

```sql
SELECT
  statement_id,
  start_time,
  client_application,
  client_driver,
  compute.warehouse_id AS warehouse_id,
  total_duration_ms,
  waiting_for_compute_duration_ms,
  waiting_at_capacity_duration_ms,
  compilation_duration_ms,
  execution_duration_ms,
  result_fetch_duration_ms,
  produced_rows,
  read_bytes,
  spilled_local_bytes,
  shuffle_read_bytes,
  from_result_cache
FROM system.query.history
WHERE compute.warehouse_id = :warehouse_id
  AND start_time >= CURRENT_TIMESTAMP() - INTERVAL 1 DAY
  AND client_driver LIKE '%ODBC%'
ORDER BY start_time DESC;
```

The query history system table is a preview feature and requires appropriate system-table permissions. For immediate incident work, the workspace Query History UI is often the fastest path.

Match a client request with a statement ID when the application exposes it. Otherwise correlate a narrow time range, user or service principal, client application, and normalized query text. Do not log secrets or sensitive parameter values for correlation.

## Phase 1: connection and authentication

If `t1 - t0` is high but Databricks has not yet recorded a statement, investigate the client path:

- DNS resolution and TCP connection time
- TLS inspection or certificate validation
- Corporate proxy traversal
- Private endpoint routing and cross-region paths
- OAuth token acquisition or refresh
- Repeated creation of short-lived connections
- Driver and client bitness or version mismatch

Use the current Databricks ODBC Driver. As of February 2026, Databricks renamed the Simba Spark ODBC Driver and stopped distributing new legacy versions. Existing legacy versions have a limited support window, so test migration before spending time tuning an obsolete driver.

For services, prefer supported OAuth machine-to-machine authentication. Reuse connections through the application's supported pooling mechanism where it is safe. Do not build a custom token cache without accounting for token expiry and concurrent refresh.

Enable driver logging only for a bounded diagnostic window. Debug and trace logs can be large and may expose connection metadata. Store them securely, then disable verbose logging after the incident.

## Phase 2: warehouse startup

A high `waiting_for_compute_duration_ms` means the statement waited for compute provisioning. This often appears when an auto-stopped warehouse receives its first request.

Serverless SQL warehouses have much faster documented startup than Pro and classic warehouses. If startup dominates:

1. Confirm the warehouse type.
2. Check whether auto-stop is aligned with the actual request cadence.
3. Prefer serverless when region, data governance, and networking requirements permit it.
4. Schedule a dashboard refresh only when freshness value justifies keeping or waking compute.
5. Compare cold and warm latency separately in service-level reports.

Do not keep a warehouse running all day to hide a rare cold start without pricing the idle period. Conversely, an aggressive auto-stop can produce repeated starts during intermittent use.

## Phase 3: queueing at capacity

A high `waiting_at_capacity_duration_ms` means the request reached compute but waited for capacity. This is different from startup.

For serverless warehouses, Intelligent Workload Management handles admission and scaling, but the configured maximum cluster count and workload still matter. For Pro and classic warehouses, cluster count is the primary concurrency control, while warehouse size supplies more resources to each query.

If many short queries queue:

- Increase the maximum cluster count within the cost envelope.
- Consolidate duplicate dashboard requests or stagger refreshes.
- Use a dedicated warehouse for latency-sensitive traffic if long ETL queries cause head-of-line pressure.
- Reduce chatty metadata and preview queries from BI tools.

If one query is slow with no queue, adding clusters usually does not make that query faster. Optimize it or test a larger warehouse size instead.

Monitor peak queued queries and queue wait by time and client:

```sql
SELECT
  DATE_TRUNC('minute', start_time) AS minute,
  client_application,
  COUNT(*) AS statements,
  ROUND(AVG(waiting_at_capacity_duration_ms), 0) AS avg_queue_ms,
  MAX(waiting_at_capacity_duration_ms) AS max_queue_ms
FROM system.query.history
WHERE compute.warehouse_id = :warehouse_id
  AND start_time >= CURRENT_TIMESTAMP() - INTERVAL 1 DAY
GROUP BY minute, client_application
ORDER BY minute DESC;
```

## Phase 4: compilation and execution

High `compilation_duration_ms` can indicate expensive planning or metadata work. High `execution_duration_ms` means the warehouse is spending time running the plan.

Open the query profile and inspect:

- Files and bytes read after pruning
- Long operators and stage imbalance
- Local spill
- Shuffle volume
- Join strategy and skew
- Rows produced relative to rows read

Improve data layout, statistics, pruning predicates, join logic, and result cardinality before simply scaling compute. Select only needed columns. Push filters and aggregation into SQL instead of pulling detail rows to the client.

Parameterize values with supported parameter markers. Avoid having a BI tool generate many semantically identical but structurally different queries unless required, because plan and result reuse depend on the actual statements and data state.

## Phase 5: result fetching

If execution is fast but `result_fetch_duration_ms` and `t4 - t3` are high, focus on result volume, network path, driver settings, and client behavior.

The current ODBC guide documents:

- `RowsFetchedPerBlock`, with a default of 10,000 rows
- `MaxBytesPerFetchRequest`, which limits bytes per fetch for Arrow result sets
- Arrow serialization and Cloud Fetch optimizations for large results in supported deployments

Increasing `RowsFetchedPerBlock` can reduce round trips, but it also increases the amount the driver and client process per block. Wide rows make a row-only setting misleading. The server can also cap Arrow rowset size regardless of the client's requested byte maximum.

Use this sequence:

1. Upgrade to a current supported driver.
2. Confirm that Cloud Fetch network prerequisites are allowed by firewalls and proxies.
3. Reduce columns and rows returned to the client.
4. Benchmark the default fetch settings.
5. Change one row or byte fetch setting at a time.
6. Measure first-row latency, full-fetch latency, client memory, and total throughput.

Do not adopt a large fetch block copied from another tool without testing. Databricks documents a larger Tableau-specific value for some extraction scenarios, but an interactive application with wide rows or low memory can behave differently.

If the user needs a chart with 20 points, returning 20 million detail rows and aggregating in the client is an application design problem, not a fetch-size problem.

## Phase 6: caching

Databricks SQL has several caches with different scope:

- The SQL UI cache is specific to SQL UI behavior.
- Local result cache lasts for the warehouse cluster lifetime or until eviction.
- Serverless remote result cache persists across warehouse stop and restart and is shared across warehouses in the workspace.
- Disk cache accelerates data reads but is not the same as a result cache.

The remote result cache is available to ODBC and JDBC clients. Local and remote result cache entries have a documented 24-hour lifetime and invalidate when underlying tables change. A running warehouse is still required to access the remote result cache.

Use `from_result_cache` and `cache_origin_statement_id` in query history to distinguish cached results. Compare cached and uncached requests explicitly. Disable result caching only for controlled benchmarks, not as a permanent troubleshooting habit.

A cache hit can still have high client fetch or rendering time if the result is large. Cache removes computation, not the need to transfer and process every returned byte.

## A symptom-to-action map

| Evidence | Likely bottleneck | First action |
| --- | --- | --- |
| Slow connect, no statement yet | DNS, TLS, proxy, OAuth, driver | Trace client connection phases |
| High wait for compute | Stopped or provisioning warehouse | Evaluate serverless and auto-stop cadence |
| High wait at capacity | Concurrency queue | Tune cluster count or isolate workloads |
| High compilation | Planning or metadata | Inspect plan and query structure |
| High execution | Scan, join, spill, skew | Use query profile and optimize SQL or data |
| High result fetch | Result size, network, driver blocks | Reduce result and benchmark fetch settings |
| Low server time, slow client render | BI or application processing | Profile the client transformation |
| Fast cache hit, slow total request | Transfer or rendering | Reduce returned data |

## Production guardrails

- Record client connect, execute, first-row, full-fetch, and render timings separately.
- Keep the driver version in connection telemetry.
- Alert on queue and provisioning wait independently.
- Cap result size at the application layer where possible.
- Use warehouse tags and workload separation for cost ownership.
- Test private network changes from the actual client subnet.
- Re-run the baseline after driver, warehouse, dashboard, or network changes.

Warehouse behavior, driver defaults, preview status, and serverless features change over time. Confirm settings in the guide that ships with the installed driver version.

## Official Documentation

- [Databricks ODBC Driver](https://docs.databricks.com/aws/en/integrations/odbc/)
- [ODBC driver capability settings](https://docs.databricks.com/aws/en/integrations/odbc/capability)
- [Migrate from the legacy Simba ODBC Driver](https://docs.databricks.com/aws/en/integrations/odbc/migration)
- [Query history](https://docs.databricks.com/aws/en/sql/user/queries/query-history)
- [Query history system table reference](https://docs.databricks.com/aws/en/admin/system-tables/query-history)
- [SQL warehouse sizing, scaling, and queuing](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-behavior)
- [Query caching](https://docs.databricks.com/aws/en/sql/user/queries/query-caching)

## Conclusion

ODBC latency is a pipeline of connection, provisioning, queueing, compilation, execution, fetching, and client processing. Use client timestamps together with Databricks query history to identify the dominant phase. Only then change auto-stop, cluster count, warehouse size, SQL, cache assumptions, or fetch settings, and verify the change against full user-visible latency and cost.
