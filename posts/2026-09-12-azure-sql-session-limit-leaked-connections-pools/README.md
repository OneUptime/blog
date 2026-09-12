# Fix Azure SQL Session Limits and Leaked Connection Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Connection Pooling, .NET, Troubleshooting, Monitoring

Description: Find the application pools behind Azure SQL session pressure, distinguish idle pooled sessions from leaks, and size connection limits across replicas.

---

A connection pool limit belongs to an application process and a particular pool. Azure SQL's session limit belongs to the database's service objective. Increasing `Max Pool Size` in every application instance can therefore turn a local queueing problem into database-wide login failures.

Start by distinguishing three signals: a client waiting for a pooled connection, the database approaching its session ceiling, and active work exhausting database workers. They require different remedies.

## Confirm which limit is reached

Capture the complete exception, including its number, message, timestamp, application instance, database, and phase. A pool acquisition timeout can occur while Azure SQL has plenty of session capacity. Conversely, many distinct pools can exhaust the database while no single pool reaches its configured maximum.

Connect directly to the affected user database with an authorized monitoring identity and inspect recent utilization:

```sql
SELECT TOP (80)
    end_time, max_session_percent, max_worker_percent,
    avg_cpu_percent, avg_data_io_percent, avg_log_write_percent
FROM sys.dm_db_resource_stats
ORDER BY end_time DESC;
```

This view requires `VIEW DATABASE STATE`. Its samples are recorded at approximately 15-second intervals and retained for approximately an hour; failover can shorten available history. Export observations during an incident. In an elastic pool, these percentages describe the database's configured maximum, so inspect pool-level utilization as well.

Match the session ceiling to the actual purchasing model, hardware, and compute size in Microsoft's resource-limit tables. A number copied from another database is not a reliable capacity budget.

## Attribute sessions to callers

With permission to see the database's sessions, group them by application and host:

```sql
SELECT
    program_name, host_name, login_name, status,
    COUNT_BIG(*) AS session_count,
    MIN(login_time) AS oldest_login,
    MAX(last_request_end_time) AS most_recent_request_end
FROM sys.dm_exec_sessions
WHERE is_user_process = 1
GROUP BY program_name, host_name, login_name, status
ORDER BY session_count DESC;
```

Azure SQL requires `VIEW DATABASE STATE` to see all connections to the current database in this view. Check visibility using a known second application connection before treating a small result as proof that the database is quiet. Host and program names are supplied by clients and are diagnostic labels, not authenticated ownership evidence.

Give each service a stable `Application Name`. Do not insert a request ID or rotating deployment identifier into the connection string: exact connection-string differences can create additional pools.

A sleeping session is not automatically leaked. Closing a pooled `SqlConnection` normally returns the physical connection to its pool, where the SQL session can remain idle for reuse. Look for a growing baseline under stable traffic, rising checked-out connections, or connections that remain held after request cancellation. Correlate those observations with application pool counters and request traces.

## Fix connection ownership

Open connections as late as practical, dispose readers and commands, and return connections on every success, exception, and cancellation path. For Microsoft.Data.SqlClient, this method keeps ownership local:

```csharp
using Microsoft.Data.SqlClient;

public static class DatabaseProbe
{
    public static async Task<int> CheckAsync(
        string connectionString, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1";
        command.CommandTimeout = 10;
        object? result = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result);
    }
}
```

The example assumes a .NET project referencing Microsoft.Data.SqlClient with implicit system usings enabled. Apply the same ownership rule to transactions and readers. Do not return a reader after its owning connection has already been disposed, or keep a connection open while awaiting an unrelated HTTP call.

Application frameworks can manage this lifetime correctly, but scopes still matter. Inspect long-lived dependency-injection scopes, background loops, unconsumed async enumerations, and transaction paths that never commit or roll back.

## Budget across the whole deployment

Estimate potential sessions as the sum of each process's distinct pool caps, then add monitoring, deployment jobs, and other callers. This is an upper-bound planning exercise, not a prediction that pools eagerly allocate every slot.

For example, 12 replicas with two pools capped at 40 can admit up to 960 pooled connections. A rolling deployment that briefly doubles replicas can raise that potential to 1,920 before accounting for other clients. Record those assumptions alongside the database's verified limit and preserve operational headroom.

SqlClient defaults to a maximum pool size of 100. Choose a smaller or larger value from measured useful concurrency and database capacity. A large `Min Pool Size` also preserves an idle baseline. If requests mostly wait for locks, increasing the pool usually admits more blocked work instead of improving throughput.

Use bounded application concurrency and backpressure. When reducing a cap, verify that queueing remains within request deadlines and that overload produces controlled failures rather than unlimited retries.

## Verify under load and after cancellation

Repeat a representative workload, inject failures and cancellations, and observe both active checkouts and total SQL sessions. Checked-out connections should return after work ends; idle physical sessions need not disappear immediately. Include rolling deployment and peak replica counts in the exercise.

Restarting a process or clearing pools can release connections temporarily, but neither repairs an ownership bug. Killing arbitrary sleeping sessions can disrupt healthy pools and produce a reconnect burst. Use targeted remediation only after identifying the caller and its transaction state.

## Conclusion

Treat database session capacity as a shared budget across all processes and pool keys. Prove leaks through lifecycle and utilization evidence, fix connection ownership, and set pool limits that preserve headroom during peak traffic and deployments.

## Official Documentation

- [Azure SQL resource management](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-logical-server?view=azuresql)
- [vCore single-database resource limits](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-vcore-single-databases?view=azuresql)
- [SqlClient connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
- [Database resource statistics](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-resource-stats-azure-sql-database)
- [Session metadata and permissions](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-sessions-transact-sql)
