# Fix Azure SQL Connection Pool Blocking After a Failed Login

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Connection Pooling, .NET, Troubleshooting, Authentication

Description: Identify cached login failures in SqlClient pools, verify Azure SQL blocking defaults, and repair authentication without confusing blocking with pool exhaustion.

---

An application can appear to retry a failed database login without making another network connection. SqlClient can temporarily cache an opening failure for a connection pool and rethrow it on subsequent attempts. This behavior is called the pool blocking period.

There is an essential Azure SQL detail: with `PoolBlockingPeriod=Auto`, blocking is disabled for recognized Azure SQL servers. Do not assume every repeated Azure SQL login error comes from this mechanism. First establish the driver, effective connection string, and timing pattern.

## Understand what the blocking period does

Where blocking is enabled, a login or timeout failure starts a five-second blocking period. Attempts during that period receive the original exception. A later failed attempt can double the next blocking period, up to one minute.

This is client-side pool behavior. It is different from SQL account lockout, database blocking, and a server-side firewall rule. It also differs from pool exhaustion: a pool with every connection checked out can make callers wait for capacity without caching a failed login.

The [PoolBlockingPeriod enumeration](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.poolblockingperiod?view=sqlclient-dotnet-core-6.0) exposes three choices:

| Setting | Behavior |
| --- | --- |
| `Auto` | Disable blocking for Azure SQL servers; enable it for other servers |
| `AlwaysBlock` | Enable the blocking mechanism for all servers |
| `NeverBlock` | Disable the blocking mechanism for all servers |

Older .NET Framework applications and different provider builds can behave differently. Inspect the assembly actually deployed, rather than relying on a package version declared in a different project.

## Capture effective configuration safely

Use `SqlConnectionStringBuilder` to inspect the pool-related values. The following example assumes Microsoft.Data.SqlClient 6.1.7 on a supported .NET runtime:

```csharp
using Microsoft.Data.SqlClient;

var configured = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")
    ?? throw new InvalidOperationException("SQL_CONNECTION_STRING is required.");
var settings = new SqlConnectionStringBuilder(configured);

Console.WriteLine(typeof(SqlConnection).Assembly.GetName().Version);
Console.WriteLine($"server={settings.DataSource}");
Console.WriteLine($"database={settings.InitialCatalog}");
Console.WriteLine($"pooling={settings.Pooling}");
Console.WriteLine($"blocking={settings.PoolBlockingPeriod}");
Console.WriteLine($"max_pool={settings.MaxPoolSize}");
```

Avoid printing the entire connection string because it can include credentials. Check configuration transformations, secret-store values, and environment overrides for an inherited `Pool Blocking Period=AlwaysBlock` setting.

Use the normal Azure SQL server hostname. A custom alias can complicate provider server classification and SQL hostname requirements. A private endpoint should still be addressed with `<server>.database.windows.net` in the connection string, not its private IP.

## Distinguish cached failure from a real retry

Record each `OpenAsync` start, duration, exception number, and client connection ID. Repeated failures returning almost immediately after an initial slower failure are consistent with cached errors, but timing alone is not proof. Credential libraries and application circuit breakers can also reject requests without a new SQL connection.

Correlate application timings with provider diagnostics or an approved network trace. If no new SQL connection is attempted during the suspected interval and blocking is enabled, the pool explanation becomes stronger.

Do not test by repeatedly submitting an intentionally invalid password to a production account. If reproduction is necessary, use an isolated test identity and server, with a bounded attempt count. For Azure SQL using `Auto`, expect that this specific cached-error mechanism is already off; repeated failures then need another explanation.

## Fix the underlying login failure

A pool setting does not repair an expired secret, a missing database user, an incorrect tenant, or an unavailable database. Establish a successful login with the intended identity and database before treating the original incident as resolved.

For a user-assigned managed identity, compare the selected client ID with the host's identity assignment and the contained SQL user's directory identity. For token-based code, inspect token lifetime handling. A startup token stored indefinitely can keep creating authentication failures even after a pool is cleared.

If a deployment changes credentials, ensure every application instance receives the new configuration. A test from one healthy instance cannot prove that the rest of the fleet stopped using stale credentials.

## Choose a deliberate pool policy

For an Azure-only application that must explicitly disable blocking, set it through the builder:

```csharp
settings = new SqlConnectionStringBuilder(configured)
{
    PoolBlockingPeriod = PoolBlockingPeriod.NeverBlock
};
using var connection = new SqlConnection(settings.ConnectionString);
await connection.OpenAsync();
```

This snippet continues the preceding program and changes only the local connection configuration. `NeverBlock` permits actual attempts; it does not add retries or make a permanent authentication error transient.

Retain bounded retry delays and concurrency limits in the application. Removing cached failures while hundreds of callers spin in tight retry loops can produce a connection storm. If `Auto` already gives the desired Azure behavior, an explicit override may add no practical benefit.

## Clear a pool only when it serves the repair

After a credential or connection-state repair, targeted pool clearing can discard connections associated with the affected configuration:

```csharp
using var poolKey = new SqlConnection(settings.ConnectionString);
SqlConnection.ClearPool(poolKey);
```

Use the same effective pool identity as the failing application. With `AccessTokenCallback`, that includes the same callback instance and compatible security context; a newly constructed unrelated callback can identify a different pool. Connections already in use are handled when returned to the pool.

Avoid calling `ClearAllPools` on every exception. It affects unrelated databases in the process and discards healthy connections. Likewise, changing the connection string for every request creates separate pools and can hide the original symptom through churn.

## Verify recovery

Observe fresh attempts from the application, successful authentication, and stable connection-open latency under normal concurrency. Confirm the corrected settings are deployed to every instance. Keep command failures separate: a successful login followed by permission denial or query timeout is a different problem.

## Conclusion

Prove pool blocking is active before changing it. Azure SQL normally has blocking disabled under `Auto`; where an override is responsible, repair the login failure, choose the intended policy, and verify actual connection attempts without introducing retry storms.

## Official Documentation

- [SqlClient connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
- [PoolBlockingPeriod property](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnectionstringbuilder.poolblockingperiod?view=sqlclient-dotnet-core-6.0)
- [PoolBlockingPeriod enumeration](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.poolblockingperiod?view=sqlclient-dotnet-core-6.0)
- [.NET Framework pool blocking migration](https://learn.microsoft.com/en-us/dotnet/framework/migration-guide/mitigation-pool-blocking-period)
- [SqlClient authentication and token callbacks](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
