# Validation Summary: Retry Azure SQL Serverless Error 40613 During Database Resume

## Status
validated

## Post Type
Technical troubleshooting guide with Azure CLI and C# examples.

## Technologies Covered
- Azure SQL Database serverless, General Purpose and Hyperscale tiers
- Azure CLI and Azure management API
- Azure Monitor Activity log
- C# and .NET asynchronous programming and cancellation
- Microsoft.Data.SqlClient 6.1.7 and ADO.NET connection pooling
- Microsoft Entra authentication and managed identities
- Entity Framework execution strategies and operation idempotency

## Sources Consulted
- [Serverless auto-pause and auto-resume](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-auto-pause-resume?view=azuresql-db)
- [Monitor serverless database status](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-monitor?view=azuresql)
- [Azure CLI: az sql db show](https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-latest#az-sql-db-show)
- [Azure SQL REST API: Databases Get](https://learn.microsoft.com/en-us/rest/api/sql/databases/get?view=rest-sql-2023-08-01)
- [Troubleshoot common connection issues](https://learn.microsoft.com/en-us/azure/azure-sql/database/troubleshoot-common-errors-issues?view=azuresql)
- [Microsoft.Data.SqlClient 6.1.7 package and supported frameworks](https://www.nuget.org/packages/Microsoft.Data.SqlClient/6.1.7)
- [SqlConnection.OpenAsync API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.openasync?view=sqlclient-dotnet-core-6.1)
- [SqlConnectionStringBuilder.ConnectRetryCount API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnectionstringbuilder.connectretrycount?view=sqlclient-dotnet-core-6.1)
- [SqlClient connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
- [SqlClient Microsoft Entra authentication](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
- [EF Core connection resiliency](https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-resiliency)
- [DB_NAME Transact-SQL function](https://learn.microsoft.com/en-us/sql/t-sql/functions/db-name-transact-sql?view=sql-server-ver17)
- [.NET 8 runtime APIs, including Random.Shared examples](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/runtime)

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The article is technically relevant and its examples use supported APIs.
- Confirmed the General Purpose auto-pause scope, first-connection resume behavior, error 40613, approximate resume latency, status values, and Activity log correlation. The post correctly avoids treating 40613 as unique evidence of a cold start or treating typical latency as a guarantee.
- Checked the Azure CLI command parameters, JSON output option, JMESPath object projection, and the database properties used for inspection. Resource names are illustrative and require an authenticated Azure CLI session with access to the intended database.
- Statically reviewed the C# control flow: at most seven OpenAsync calls, six retry delays, disposal of failed connections, linked cancellation during opening and delay, immediate propagation of nonmatching exceptions, and propagation of the last 40613. Delays start at five and ten seconds, then use twenty seconds, each with less than one second of jitter. The cancellation budget can end the loop before the attempt limit.
- The three-minute budget applies to connection opening and retry delays. The later query has its separate thirty-second command timeout. Cancellation is cooperative; this is not a hard real-time wall-clock guarantee. The sample intentionally passes CancellationToken.None; application callers must supply their own token to exercise caller cancellation.
- Microsoft.Data.SqlClient 6.1.7 exists. The package documents modern .NET support starting at .NET 8. The sample assumes a modern console project with implicit System, LINQ, threading, and task usings enabled. Its top-level statements and Random.Shared are appropriate for that setup.
- Active Directory Default is supported by the specified driver version. It requires an available credential and database authorization; the documentation cautions that credential discovery can add latency. The article appropriately presents it as a local example.
- New SqlConnection objects do not necessarily create new physical connections because pooling remains enabled. The post correctly describes disposal of connection objects and does not disable pooling. Azure SQL endpoints do not use the pool login-error blocking period by default; explicitly overridden pooling settings can affect observed retries.
- The command is executed only after a successful open. The discussion of uncertain write outcomes, transaction execution strategies, and idempotency agrees with EF Core guidance.
- All five technical links in the post resolved to the intended official documentation or Microsoft package page. A newer package version exists, but the article explicitly targets 6.1.7 and does not claim it is the latest release.
- Validation consisted of official-documentation checks and static code review. No live Azure connection, actual pause/resume cycle, authentication-failure test, or cancellation integration test was run. Compilation was not performed because the installed SDKs are .NET 6.0.200 and 6.0.201, below the package's documented modern .NET support baseline.
