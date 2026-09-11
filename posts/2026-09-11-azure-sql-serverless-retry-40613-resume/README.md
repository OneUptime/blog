# Retry Azure SQL Serverless Error 40613 During Database Resume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Serverless, Retry, .NET, Troubleshooting

Description: Handle Azure SQL serverless resume failures with bounded connection retries, cancellation, fresh connection attempts, and status-based verification.

---

A paused Azure SQL serverless database cannot immediately serve the first incoming connection. That attempt triggers resume and can return SQL error 40613 while the database becomes available. An application that treats the first failure as permanent turns an expected idle-to-active transition into a visible outage.

Build a bounded connection retry path and verify that the failure coincides with a resume event. Error 40613 indicates database unavailability; it is not unique proof of a serverless cold start. Persistent failures need an availability investigation even when retries are present.

## Confirm this is a pause-and-resume scenario

Auto-pause and auto-resume currently apply to the General Purpose serverless service tier. Serverless Hyperscale does not provide the same auto-pause behavior. Inspect the actual database rather than inferring its tier from a naming convention.

```bash
az sql db show --resource-group rg-data \
  --server orders-prod --name orders \
  --query '{status:status,sku:sku,autoPauseDelay:autoPauseDelay,minCapacity:minCapacity}' \
  --output json
```

Use the returned status and the database's Activity log to correlate the first failed connection with `Paused` or `Resuming`. Microsoft documents resume latency generally around a minute, but this is an operational expectation, not a guaranteed deadline for every connection.

Changing configuration and running exploratory SQL queries can affect the database state. During a reproduction, observe status through the management API and record exactly when the application initiates its first connection.

## Retry connection opening within one budget

The following example uses Microsoft.Data.SqlClient 6.1.7 on a supported .NET runtime. Configure `SQL_CONNECTION_STRING` for the intended database and authentication method. A local passwordless example can use `Authentication=Active Directory Default` with that 6.x driver version.

```csharp
using Microsoft.Data.SqlClient;

var configured = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")
    ?? throw new InvalidOperationException("SQL_CONNECTION_STRING is required.");
using var connection = await OpenAfterResumeAsync(configured, CancellationToken.None);
using var command = connection.CreateCommand();
command.CommandTimeout = 30;
command.CommandText = "SELECT DB_NAME();";
Console.WriteLine(await command.ExecuteScalarAsync());

static async Task<SqlConnection> OpenAfterResumeAsync(
    string configured, CancellationToken cancellationToken)
{
    var settings = new SqlConnectionStringBuilder(configured)
    {
        ConnectTimeout = 15,
        ConnectRetryCount = 0,
        ApplicationName = "serverless-resume-demo"
    };
    using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    budget.CancelAfter(TimeSpan.FromMinutes(3));

    for (var attempt = 1; ; attempt++)
    {
        budget.Token.ThrowIfCancellationRequested();
        var connection = new SqlConnection(settings.ConnectionString);
        try
        {
            await connection.OpenAsync(budget.Token);
            return connection;
        }
        catch (SqlException error) when (
            error.Errors.Cast<SqlError>().Any(item => item.Number == 40613)
            && attempt < 7)
        {
            await connection.DisposeAsync();
            var seconds = Math.Min(5 * Math.Pow(2, attempt - 1), 20);
            var delay = TimeSpan.FromSeconds(seconds + Random.Shared.NextDouble());
            Console.Error.WriteLine(
                $"resume_retry={attempt} delay_ms={delay.TotalMilliseconds:F0} " +
                $"connection_id={error.ClientConnectionId}");
            await Task.Delay(delay, budget.Token);
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }
}
```

The loop retries only opening failures containing 40613. It disposes failed connection objects, uses increasing delays with jitter, and stops after seven attempts or the cancellation budget. Other errors propagate immediately. The final 40613 also propagates because the catch filter no longer accepts it.

`ConnectRetryCount=0` makes this example's retry ownership explicit. It avoids confusing the demonstrated loop with the driver's separate connection recovery settings. Review any ORM execution strategy and surrounding HTTP retry policy before adding this loop to an existing application; layered retries can multiply the total work.

## Keep the caller's deadline meaningful

Three minutes is an example operational budget, not a recommendation for every HTTP request. If the caller can wait only ten seconds, a three-minute synchronous recovery path cannot satisfy that request. Pass the caller's cancellation token, or move a long-running operation to a durable background workflow.

For an interactive application, decide whether the user should see a warming-up response, whether a deployment should perform a controlled warm-up, or whether auto-pause conflicts with the response-time objective. Making retries unlimited only hides the mismatch until another layer gives up.

When many instances start together, coordinate deployment concurrency and retain jitter. Each instance independently retrying at exactly five-second intervals can create synchronized bursts during recovery.

## Keep command replay separate

The example runs its query only after opening succeeds. It does not replay arbitrary business commands. That boundary matters: a connection failure during or after a write can leave the application uncertain whether the database committed the work.

If an ORM retries complete operations, use its documented transaction execution strategy and the application's idempotency design. Payments, provisioning requests, and other externally visible operations need an operation identifier or another mechanism that prevents duplication.

A managed identity login failure caused by a missing contained user will not be repaired by waiting for resume. Likewise, a private DNS error or an expired credential needs a different response. Avoid classifying every SQL exception as a cold start.

## Verify the behavior after an actual pause

Use a test database with auto-pause enabled. Stop health checks and other clients, disconnect diagnostic sessions, and wait for the management-plane status to become `Paused`. Then start the test application and record attempt times, error numbers, Activity log events, and time to the first successful query.

Repeat with cancellation to confirm the application does not keep retrying after its caller has stopped waiting. Also test an invalid database user and verify that a permanent authentication failure is surfaced promptly instead of being retried as 40613.

For ongoing monitoring, track cold-start count and recovery duration separately from unrelated connection failures. A sudden increase in resume events may indicate a changed traffic pattern, while repeated resume failure beyond the budget warrants investigation.

## Conclusion

Treat documented serverless resume failures as a bounded connection-recovery case. Verify the database transition, retry opening with cancellation and jitter, and keep business-command replay under a separate, deliberate reliability policy.

## Official Documentation

- [Serverless auto-pause and auto-resume](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-auto-pause-resume?view=azuresql-db)
- [Monitor serverless database status](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-monitor?view=azuresql)
- [SqlClient connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
- [SqlClient authentication](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
- [Microsoft.Data.SqlClient package](https://www.nuget.org/packages/Microsoft.Data.SqlClient/6.1.7)
