# Validation Summary: Fix Azure SQL Connection Pool Blocking After a Failed Login

## Status

validated

## Post Type

Technical troubleshooting guide with C# implementation examples.

## Technologies Covered

- Azure SQL Database and Azure Private Link
- Microsoft.Data.SqlClient 6.1.7 and ADO.NET connection pooling
- C# and .NET, including historical .NET Framework behavior
- Microsoft Entra authentication, managed identities, and access tokens

## Sources Consulted

- [SqlClient connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
- [PoolBlockingPeriod enumeration](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.poolblockingperiod?view=sqlclient-dotnet-core-6.0)
- [PoolBlockingPeriod property and connection-string keyword](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnectionstringbuilder.poolblockingperiod?view=sqlclient-dotnet-core-6.0)
- [SqlConnectionStringBuilder API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnectionstringbuilder?view=sqlclient-dotnet-core-6.0)
- [.NET Framework pool blocking migration](https://learn.microsoft.com/en-us/dotnet/framework/migration-guide/mitigation-pool-blocking-period)
- [Microsoft.Data.SqlClient 6.1.7 package and supported frameworks](https://www.nuget.org/packages/Microsoft.Data.SqlClient/6.1.7)
- [SqlClient Microsoft Entra authentication](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
- [AccessTokenCallback API and pool identity](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstokencallback?view=sqlclient-dotnet-core-6.0)
- [AccessToken API and token lifetime responsibilities](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstoken?view=sqlclient-dotnet-core-6.0)
- [ClearPool API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.clearpool?view=sqlclient-dotnet-core-6.0)
- [OpenAsync API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.openasync?view=sqlclient-dotnet-core-6.0)
- [Azure SQL private endpoint hostname requirements](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql)
- [C# top-level statements, implicit imports, and await](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/top-level-statements)

## Issues Found

No technical issues found.

## Review Notes

- Confirmed the five-second initial blocking interval, subsequent doubling up to one minute, and reuse of the original exception during a blocking interval. The post correctly distinguishes this behavior from waiting for an available pooled connection.
- Confirmed the three blocking policies and the default Azure SQL exception. The warning about recognized server names is appropriate; Microsoft's migration documentation identifies Azure hostname suffixes and dates the Framework behavior change to 4.6.2.
- Reviewed all three C# snippets against the documented APIs. The builder properties, enum assignment, asynchronous open, disposal declarations, and targeted pool clearing are valid. The later snippets use variables established earlier. The initial snippet assumes the implicit System import provided by modern console templates; projects without implicit imports need `using System;`.
- Confirmed that clearing a pool discards checked-out connections when returned, and that connection-string differences and callback identity affect pooling. The simple clearing snippet fits connection-string-based authentication; callback-based applications must also supply their existing callback as explained in the adjacent text.
- Confirmed the private endpoint FQDN requirement, user-assigned managed identity client-ID selection for SqlClient 3.0 and newer, and application responsibility for directly supplied access-token expiration.
- Timing and missing network activity are appropriately presented as diagnostic evidence rather than conclusive proof. Repairing authentication, checking all instances, and bounding retries are sound operational guidance.
- Microsoft.Data.SqlClient 6.1.7 exists and supports .NET 8.0+ and .NET Framework 4.6.2+. It is not the newest available release, but the article does not claim otherwise. A future update to SqlClient 7.x should account for its separate Microsoft.Data.SqlClient.Extensions.Azure dependency for built-in Microsoft Entra authentication modes.
- All five technical documentation links in the post resolve to the intended Microsoft resources. There are no terminal commands to validate.
- Validation used documentation and static code review. Only .NET 6 SDKs are installed locally, so the examples were not compiled or executed on the package's supported modern runtime. No Azure SQL endpoint or test identity was supplied; live authentication, failure caching, network traces, and recovery under concurrency were not tested.
- README.md was left unchanged because no technical correction was necessary.
