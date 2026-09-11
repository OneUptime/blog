# Diagnose Connection Timeouts vs Command Timeouts in Azure SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, .NET, Troubleshooting, Monitoring, SQL Server

Description: Separate Azure SQL connection, pool acquisition, command, and caller timeouts with phase-level timing, driver settings, and targeted database diagnostics.

---

A timeout describes a client giving up, not a single database failure. A request can time out while acquiring a connection, negotiating a login, executing a command, or waiting for the calling HTTP request's deadline. Changing the wrong timeout can make the incident longer without changing its cause.

Start by locating the operation that failed. For Microsoft.Data.SqlClient, `OpenAsync` and `ExecuteReaderAsync` belong to different phases and have different settings. Preserve the complete exception, elapsed time, and operation name before changing either setting.

## Identify the deadline that expired

| Phase | Typical setting or signal | First investigation |
| --- | --- | --- |
| Opening a connection | `Connect Timeout` / `Connection Timeout` | DNS, route, TLS, authentication, availability |
| Waiting for a pooled connection | Pool exhaustion message during `Open` | Leaked or long-held connections, concurrency |
| Running or reading a command | `SqlCommand.CommandTimeout` | Blocking, plans, resource pressure, response reads |
| Entire application request | Cancellation token or upstream timeout | End-to-end budget and retry layering |

SqlClient's connection timeout defaults to 15 seconds; a command's timeout defaults to 30 seconds. Libraries and frameworks can override those values, so inspect the effective application configuration. A command timeout of zero disables that limit rather than selecting an automatic value.

The command timeout also applies to network reads performed during command execution and result processing. It is not simply a stopwatch around CPU time inside SQL Server, nor does it include arbitrary application work between reads. See the [CommandTimeout API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlcommand.commandtimeout?view=sqlclient-dotnet-core-6.0) for those distinctions.

## Add timing around the two operations

The following console example uses a supported .NET runtime and Microsoft.Data.SqlClient 6.1.7. It reads an already configured connection string from the environment and runs a harmless query.

```csharp
using System.Diagnostics;
using Microsoft.Data.SqlClient;

var configured = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")
    ?? throw new InvalidOperationException("SQL_CONNECTION_STRING is required.");
var settings = new SqlConnectionStringBuilder(configured)
{
    ConnectTimeout = 15,
    ApplicationName = "timeout-diagnostic"
};

using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(60));
using var connection = new SqlConnection(settings.ConnectionString);
var phase = "open";
var timer = Stopwatch.StartNew();

try
{
    await connection.OpenAsync(deadline.Token);
    Console.WriteLine($"open_ms={timer.ElapsedMilliseconds}");

    phase = "command";
    timer.Restart();
    using var command = connection.CreateCommand();
    command.CommandTimeout = 10;
    command.CommandText = "SELECT DB_NAME();";
    var database = await command.ExecuteScalarAsync(deadline.Token);
    Console.WriteLine($"command_ms={timer.ElapsedMilliseconds} database={database}");
}
catch (SqlException error)
{
    Console.Error.WriteLine(
        $"phase={phase} elapsed_ms={timer.ElapsedMilliseconds} " +
        $"number={error.Number} connection_id={error.ClientConnectionId}");
    throw;
}
catch (OperationCanceledException)
{
    Console.Error.WriteLine($"phase={phase} caller_deadline_expired=true");
    throw;
}
catch (InvalidOperationException error)
{
    Console.Error.WriteLine(
        $"phase={phase} elapsed_ms={timer.ElapsedMilliseconds} " +
        $"exception_type={error.GetType().Name}");
    throw;
}
```

For passwordless local testing with that driver version, the connection string can use `Authentication=Active Directory Default`, provided the local identity has database access. If adopting SqlClient 7.x, also review its Entra authentication extension packaging requirements.

In a real service, write these fields to structured telemetry and preserve the exception details in restricted diagnostic logs. Do not log a connection string that might contain credentials. Include attempt number when retries are enabled so several operations do not appear to be one unusually long call.

Pool acquisition timeouts can surface as `InvalidOperationException`, so catching only `SqlException` would miss their phase record. Preserve the original exception after recording the timing.

## Investigate an opening timeout

Read whether the message mentions pre-login, login, or obtaining a connection from the pool. Pre-login failures can involve DNS, TCP, TLS negotiation, and server response; a query plan cannot explain a command that was never submitted.

From the application host, resolve the SQL hostname and test TCP 1433. For a private endpoint, compare the result with its actual private IP and inspect Redirect requirements. A token provider can add authentication latency, so record credential acquisition failures separately from SQL command execution.

Pool acquisition is another possible `Open` delay. If all connections are in use, another request waits for one to become available. Inspect connection disposal, unclosed readers, long transactions, and concurrency before increasing `Max Pool Size`. Scaling the pool can transfer the overload to the database without correcting its source.

A serverless database resuming from pause introduces another availability transition. Correlate with database status and activity logs rather than treating every first request after an idle period as a network outage.

## Investigate a command timeout

If opening succeeds quickly but the command times out, inspect the request while it is running from a separate authorized diagnostic session:

```sql
SELECT session_id, status, command, blocking_session_id,
       wait_type, wait_time, cpu_time, total_elapsed_time
FROM sys.dm_exec_requests
WHERE database_id = DB_ID()
  AND session_id <> @@SPID
ORDER BY total_elapsed_time DESC;
```

The diagnostic account needs the relevant DMV visibility permissions for the database and service tier. An empty result set after the timeout is not evidence that the command was never running: cancellation may already have removed it.

Correlate the query with Query Store, execution plans, blocking, and Azure resource metrics. Microsoft's [query timeout troubleshooting guide](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/troubleshoot-query-timeouts) explains why application cancellation and query performance must be investigated together.

For a controlled reproduction in a test database, temporarily replace the query with `WAITFOR DELAY '00:00:12'; SELECT 1;` while keeping `CommandTimeout=10`. This consumes a session for the delay and should demonstrate the command phase failing. Do not run the artificial delay repeatedly in production.

## Repair the cause and verify the budget

Assign an end-to-end deadline that includes connection attempts, command execution, and retry delays. Increasing one timeout beyond the upstream request deadline creates work that the caller can no longer use.

If a timed-out command performed writes, do not assume it made no changes. Retry only through the application's established transaction and idempotency design. After a repair, verify latency for the actual query and concurrency level that originally failed, not only `SELECT 1`.

## Conclusion

Separate opening, pool waiting, execution, and caller cancellation in telemetry. Once the failing phase is known, adjust the relevant configuration only alongside evidence that the network path, connection lifecycle, or query behavior has been repaired.

## Official Documentation

- [Connection timeout troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/connect/timeout-expired-error)
- [Query timeout troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/troubleshoot-query-timeouts)
- [ConnectTimeout API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnectionstringbuilder.connecttimeout?view=sqlclient-dotnet-core-6.0)
- [CommandTimeout API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlcommand.commandtimeout?view=sqlclient-dotnet-core-6.0)
- [SqlClient connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
