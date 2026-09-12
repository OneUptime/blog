# Validation Summary: Prevent Managed Identity Tokens from Fragmenting Azure SQL Pools

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure SQL Database
- Microsoft Entra managed identities
- Microsoft.Data.SqlClient 5.2 and later
- Microsoft.Data.SqlClient.Extensions.Azure for SqlClient 7.0
- Azure.Identity 1.21.0
- .NET and C#
- ADO.NET connection pooling

## Sources Consulted
- [Connect to Azure SQL with Microsoft Entra authentication and SqlClient](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
- [SqlConnection.AccessToken property](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstoken?view=sqlclient-dotnet-core-7.0)
- [SqlConnection.AccessTokenCallback property](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstokencallback?view=sqlclient-dotnet-core-7.0)
- [SQL Server connection pooling (ADO.NET)](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
- [ManagedIdentityCredential class](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.managedidentitycredential)
- [ManagedIdentityId.SystemAssigned property](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.managedidentityid.systemassigned?view=azure-dotnet)
- [Azure.Identity 1.21.0 package](https://www.nuget.org/packages/Azure.Identity/1.21.0)

## Issues Found
No technical issues found.

## Review Notes
The version-specific claims were confirmed: `AccessTokenCallback` is available in Microsoft.Data.SqlClient 5.2 and later; user-assigned managed identity selection uses the client ID in SqlClient 3.0 and later; and SqlClient 7.0 requires `Microsoft.Data.SqlClient.Extensions.Azure` for driver-provided Microsoft Entra authentication modes but not for `AccessToken` or `AccessTokenCallback`. The helper uses the current non-obsolete `ManagedIdentityCredential(ManagedIdentityId)` constructor and preserves a stable callback instance as required for pooling.
