# Diagnose High Azure MySQL Memory Use Before Scaling Up

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Performance, Troubleshooting

Description: Separate useful MySQL caching from memory pressure using Azure metrics, connection trends, instrumented allocations, and version-aware temporary-table checks.

High memory use can mean that MySQL is caching useful data. It can also mean that a burst of concurrent queries is pushing the server toward allocation failures. Scaling before distinguishing those cases can hide the problem without explaining it.

Start with a timeline, then identify which kind of memory is growing. The goal is enough capacity for the required workload, with evidence that the chosen change improves reliability rather than merely lowering a chart.

## Confirm what the percentage measures

Azure's `memory_percent` describes the MySQL server process relative to the service's documented **Total Memory Size**. That is not simply the physical RAM printed beside a compute size: Azure distinguishes physical memory from a total that includes a temporary-storage component. Small Burstable sizes can encounter out-of-memory failures even below a displayed 100%. Read the current definitions in the [MySQL service-tier documentation](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage).

Do not conclude that a server has plenty of spare RAM because the chart reads 70%. Equally, do not conclude that a steady high percentage proves a leak. Correlate the metric with application latency, connection failures, throughput, CPU, I/O, and restarts.

Azure's [monitoring reference](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference) lists the supported metric names and aggregations. Use a common time window and inspect peaks as well as averages. Preserve gaps as missing observations; connecting them into a smooth line can obscure an outage.

A useful incident record includes the server size, exact MySQL version, workload start time, application replica count, connection-pool configuration, recent parameter changes, and any restart. Take this record before changing capacity.

## Separate caches from workload allocations

MySQL uses memory for shared caches, connection handling, and query execution. The InnoDB buffer pool caches table and index pages so repeated reads do not always need disk access. A populated buffer pool is usually doing useful work. See [MySQL memory use](https://dev.mysql.com/doc/refman/8.0/en/memory-use.html) and the [InnoDB buffer pool](https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html).

Use these patterns as hypotheses:

| Pattern | First question to investigate |
|---|---|
| Memory rises during warm-up, then stabilizes | Is the buffer pool filling while latency remains healthy? |
| Memory rises with application replicas | Did the total number of database connections multiply? |
| Memory spikes during reporting | Are concurrent sorts, joins, or temporary tables growing? |
| Memory stays elevated after workload changes | Which instrumented allocations remain, and what changed? |
| Restarts or allocation errors occur | Is immediate workload reduction or extra headroom needed? |

Several patterns can occur together. Avoid applying a fixed formula that multiplies every configured buffer by `max_connections` and treats the result as measured usage. Allocations depend on actual activity, and not every connection allocates every buffer simultaneously.

## Capture configuration and activity

The SQL examples here target **MySQL 8.0.46**. Use a diagnostic account with permission to read the relevant Performance Schema tables. These are inspection queries, not tuning commands. On other versions, review the available variables and temporary-table behavior first.

Start with the running configuration:

```sql
SELECT VERSION() AS mysql_version,
       @@GLOBAL.innodb_buffer_pool_size AS buffer_pool_bytes,
       @@GLOBAL.max_connections AS connection_limit,
       @@GLOBAL.sort_buffer_size AS global_sort_buffer_bytes,
       @@GLOBAL.join_buffer_size AS global_join_buffer_bytes,
       @@GLOBAL.internal_tmp_mem_storage_engine AS internal_tmp_engine,
       @@GLOBAL.tmp_table_size AS global_tmp_table_bytes,
       @@GLOBAL.temptable_max_ram AS temptable_ram_limit_bytes;
```

These global values are a configuration snapshot. Sessions can have different effective values for session-scoped variables. Compare them with the parameter changes actually deployed and with new application sessions, rather than assuming every existing connection adopted a global change. Azure exposes supported configuration through [server parameters](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-server-parameters).

Next capture activity counters at two known times during the affected workload:

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Uptime',
  'Threads_connected',
  'Threads_running',
  'Max_used_connections',
  'Created_tmp_tables',
  'Created_tmp_disk_tables',
  'Innodb_buffer_pool_read_requests',
  'Innodb_buffer_pool_reads'
)
ORDER BY VARIABLE_NAME;
```

`Threads_connected` and `Threads_running` describe current activity, while `Max_used_connections` is a historical peak. Temporary-table and buffer-read counters accumulate; compare their changes over the interval, accounting for resets and restarts. The [server status reference](https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html) defines these meanings.

For buffer-pool reads, an interval estimate is `1 - delta(reads) / delta(read_requests)`. For example, 500 disk-required reads out of 100,000 logical read requests gives 99.5%. Do not calculate it when the request delta is zero or when counters reset. Even a high percentage can hide substantial absolute disk traffic at a large request rate, so retain the counts and latency alongside the ratio.

## Inspect instrumented allocations

Performance Schema can attribute memory to named internal components:

```sql
SELECT EVENT_NAME,
       ROUND(CURRENT_NUMBER_OF_BYTES_USED / 1048576.0, 2) AS current_mib,
       ROUND(HIGH_NUMBER_OF_BYTES_USED / 1048576.0, 2) AS high_mib
FROM performance_schema.memory_summary_global_by_event_name
WHERE CURRENT_NUMBER_OF_BYTES_USED > 0
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 15;
```

This ranks current allocations, not lifetime allocation totals. The high-water value records a peak estimate for that component. Do not add all component peaks and label the sum as simultaneous server usage. MySQL documents these columns and their behavior in [memory summary tables](https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html).

Treat this as attribution of instrumented allocations, not a complete measurement of process or host memory. Check whether relevant memory instruments were enabled when allocations occurred; enabling them later does not reconstruct previously uninstrumented allocations. An empty result is not proof of no memory use. Do not truncate diagnostic summary tables as a memory-release technique: resetting their statistics does not free the underlying allocations.

Take comparable snapshots before, during, and after a controlled workload. A component that grows with worker concurrency points to a different intervention from a stable buffer pool.

## Review temporary tables using the right version rules

Older tuning advice often says that an internal temporary table is limited by the smaller of `tmp_table_size` and `max_heap_table_size`. That applies to the MEMORY engine path, not universally to the default TempTable engine in modern MySQL 8.0.

For the example version, `tmp_table_size` limits an individual TempTable internal table, while `temptable_max_ram` controls the engine's shared RAM allowance. There are additional thread-local and overflow considerations. `Created_tmp_disk_tables` also does not count temporary tables created in memory-mapped files. See [internal temporary-table behavior](https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html).

This means a low disk-temporary-table counter is not proof that all temporary work stayed in RAM. Review the query plan, selected columns, result size, concurrency, and temporary-storage activity together. Raising every temporary-table limit to avoid disk activity can make memory pressure worse.

## Choose a change you can verify

If memory growth follows a connection surge, calculate the total pool capacity across all application replicas and background workers. Limit concurrency at the application boundary and investigate abandoned or excessive connections. A higher `max_connections` setting does not create memory.

If one report creates large intermediate results, reduce unnecessary rows and columns, improve the access path, or schedule fewer copies concurrently. Microsoft's [low-memory troubleshooting guide](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-troubleshoot-low-memory-issues) identifies oversized buffers, inefficient queries, and excessive connections as common contributors.

If the required workload remains memory constrained after those checks, plan a larger compute size or an appropriate memory-focused tier. Record the expected benefit: fewer allocation failures, stable latency at the required concurrency, or lower disk-read pressure. Do not define success only as a lower percentage.

Before changing a parameter, confirm Azure permits the value and whether it needs a restart. Before scaling compute, plan the connection interruption and application recovery. Avoid shrinking the buffer pool simply to make the chart look better; that can trade memory use for additional I/O.

Verify the change through the same workload window and comparable request rate. Keep the configuration, snapshots, application outcomes, and rollback decision together. When the measurements remain incomplete, preserve that uncertainty and collect better evidence instead of presenting an unexplained resize as a diagnosis.
