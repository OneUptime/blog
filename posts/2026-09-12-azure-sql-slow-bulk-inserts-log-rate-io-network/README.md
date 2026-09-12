# Diagnose Slow Azure SQL Bulk Inserts and Log Rate Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, SQL Server, Performance, Data Engineering, Troubleshooting

Description: Separate Azure SQL log-rate governance from storage, blocking, and client bottlenecks using interval measurements and controlled bulk-load experiments.

---

A bulk load that stops scaling when you add writers is not necessarily limited by network bandwidth. Azure SQL can govern the rate at which transactions generate log records. More concurrent loaders then compete for the same allowance and make application latency worse.

Measure the client and database over the same interval. Rows per second alone cannot distinguish wide rows, extra indexes, log throttling, slow source reads, and transaction commit overhead.

## Establish a repeatable baseline

Record the database service objective, hardware, pool membership, target schema, index count, row count, input bytes, batch size, writer count, and transaction mode. Keep the input and target state comparable between trials. A second run against a table with more indexes or duplicate keys is a different experiment.

Measure source-read time, serialization time, connection-open time, bulk-copy time, and commit time separately. Track committed rows rather than rows merely handed to a client API. If an error interrupts a load, reconcile its committed batches before restarting.

Start with one writer. Increase concurrency only after identifying unused capacity; otherwise, parallelism can hide the bottleneck behind additional queueing.

## Capture database utilization

Connect to the affected user database with `VIEW DATABASE STATE`:

```sql
SELECT TOP (80)
    end_time, avg_cpu_percent, avg_data_io_percent,
    avg_log_write_percent, max_worker_percent, max_session_percent
FROM sys.dm_db_resource_stats
ORDER BY end_time DESC;
```

These are interval samples, not a per-query explanation. In an elastic pool, inspect pool metrics too. A database may be affected by other databases consuming shared capacity.

Collect completed wait totals at the beginning and end of the test without resetting shared diagnostic counters:

```sql
SELECT wait_type, waiting_tasks_count, wait_time_ms
FROM sys.dm_db_wait_stats
WHERE wait_type IN (
    N'LOG_RATE_GOVERNOR', N'POOL_LOG_RATE_GOVERNOR',
    N'INSTANCE_LOG_RATE_GOVERNOR', N'WRITELOG',
    N'PAGEIOLATCH_SH', N'PAGEIOLATCH_EX',
    N'ASYNC_NETWORK_IO'
)
OR wait_type LIKE N'HADR_THROTTLE_LOG_RATE%'
OR wait_type LIKE N'RBIO_RG_%'
OR wait_type LIKE N'LCK_M_%'
ORDER BY wait_type;
```

Subtract the first snapshot from the second by wait type, treating an absent row as zero only when both snapshots are otherwise valid. If counters reset or the database fails over, discard the comparison. Database waits include all concurrent workloads and sum time across workers, so total wait milliseconds can exceed wall-clock duration.

## Interpret log-related waits precisely

`LOG_RATE_GOVERNOR` indicates database log-rate shaping; `POOL_LOG_RATE_GOVERNOR` indicates pool shaping. These waits occur while log records are generated. They are not simply a count of slow physical writes to the transaction-log file.

`WRITELOG` describes waiting for a log flush. It can point toward commit frequency or log I/O behavior, but it is different from exceeding a log-generation allowance. Replication feedback can also reduce the allowed rate. Hyperscale exposes additional `RBIO_RG_*` waits and diagnostic functions because its log service, replicas, and page servers introduce distinct consumers.

When governance dominates and committed throughput plateaus, adding writers cannot manufacture a larger allowance. Compare the next service objective's documented log-rate limit and test it with the same load. More vCores do not imply unlimited linear improvement across every hardware family and tier.

## Check the client before blaming the network

A database with low CPU, I/O, log utilization, and little work to do may be waiting for the producer. Inspect source file reads, decompression, transformations, and row-by-row API calls. Place a test loader near the database to distinguish WAN effects from application overhead.

`ASYNC_NETWORK_IO` means SQL is waiting while sending results to a client. It does not directly prove that an inbound bulk-upload link is saturated. For ingestion, inspect client throughput and the actual operation instead of treating any network-named wait as a bandwidth diagnosis.

If using `SqlBulkCopy` with a streaming reader, `EnableStreaming` can reduce materialization pressure for supported reader inputs. It does not eliminate database logging or make an already materialized `DataTable` a streaming source.

## Tune batch and transaction boundaries separately

A bulk API's batch size and its transaction scope are different controls. If the entire operation participates in one external transaction, smaller batches do not make that transaction commit after each batch. Decide whether atomic all-or-nothing loading or resumable batch commits are required.

Small committed batches can spend disproportionate time on round trips and commits. Very large transactions can increase locking, log retention, recovery work, and retry cost. Test several bounded sizes against representative row widths instead of copying a universal row count.

Every additional maintained index can add write and log work. For a controlled ingestion design, compare a staging table with the production target and account for the cost of later transformation and index maintenance. Do not drop production indexes solely to improve one benchmark without evaluating concurrent readers and reconstruction time.

Azure SQL Database does not offer a user-controlled switch to SIMPLE recovery as an ingestion fix. Likewise, `TABLOCK` is not a promise that an Azure SQL load becomes unlogged. Keep durability requirements explicit.

## Verify the improvement end to end

Compare committed rows per second, bytes per second, tail latency of normal traffic, CPU, log pressure, and the dominant wait deltas. Repeat enough comparable trials to distinguish a stable gain from a quiet interval in a shared pool.

A successful bulk load must also reconcile input and output counts, handle duplicate/replayed batches, and preserve application responsiveness. Improving the loader while starving foreground requests is not an operational improvement.

## Conclusion

Diagnose bulk ingestion with synchronized client timings, resource samples, and wait deltas. Change writer count, batching, target design, or service capacity only after identifying which resource actually limits committed throughput.

## Official Documentation

- [Transaction log rate governance](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-logical-server?view=azuresql)
- [Hyperscale performance diagnostics](https://learn.microsoft.com/en-us/azure/azure-sql/database/hyperscale-performance-diagnostics?view=azuresql)
- [Database wait statistics](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-wait-stats-azure-sql-database)
- [Database resource statistics](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-resource-stats-azure-sql-database)
- [SqlBulkCopy transaction and bulk-copy operations](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/transaction-bulk-copy-operations?view=sql-server-ver17)
- [SqlBulkCopy.EnableStreaming](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlbulkcopy.enablestreaming?view=sqlclient-dotnet-core-6.1)
