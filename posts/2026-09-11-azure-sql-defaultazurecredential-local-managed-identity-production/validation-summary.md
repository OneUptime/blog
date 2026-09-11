# Validation Summary: Use DefaultAzureCredential Locally and Managed Identity for Azure SQL

## Status
validated

## Post Type
Tutorial / implementation guide.

## Technologies Covered
- Azure SQL Database and Microsoft Entra ID
- System-assigned and user-assigned managed identities
- Azure.Identity 1.21.0 and DefaultAzureCredential
- Microsoft.Data.SqlClient 6.1.7 and AccessTokenCallback
- C#, .NET, Azure CLI, Bash, and Transact-SQL

## Sources Consulted
- [Azure SQL .NET quickstart](https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-sql-dotnet-quickstart?view=azuresql)
- [Azure Identity authentication best practices](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/best-practices)
- [Credential chains](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/credential-chains)
- [SqlClient Entra authentication and callback behavior](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17#using-accesstokencallback)
- [AccessTokenCallback API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstokencallback?view=sqlclient-dotnet-core-6.0)
- [ManagedIdentityCredential constructors](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.managedidentitycredential.-ctor?view=azure-dotnet)
- [ManagedIdentityId API](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.managedidentityid?view=azure-dotnet)
- [Azure.Identity 1.21.0 package](https://www.nuget.org/packages/Azure.Identity/1.21.0)
- [Microsoft.Data.SqlClient 6.1.7 package and dependencies](https://www.nuget.org/packages/Microsoft.Data.SqlClient/6.1.7)
- [Configure database identities](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure?view=azuresql)
- [GRANT object permissions](https://learn.microsoft.com/en-us/sql/t-sql/statements/grant-object-permissions-transact-sql?view=sql-server-ver17)
- [DB_NAME](https://learn.microsoft.com/en-us/sql/t-sql/functions/db-name-transact-sql?view=sql-server-ver17)
- [USER_NAME](https://learn.microsoft.com/en-us/sql/t-sql/functions/user-name-transact-sql?view=sql-server-ver17)
- [dotnet new](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new)
- [dotnet package add / dotnet add package](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add)
- [dotnet run](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-run)
- [Azure CLI interactive and tenant-specific login](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-interactively)
- [C# static initialization](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/static-constructors)

## Issues Found
1. The prose described credential selection as happening at process startup. Static field initialization is tied to type initialization, so the wording now says the credential is selected when the connection factory initializes. The example calls the factory immediately, but reusable consumers need not do so.
2. The provisioning instructions did not explicitly specify Microsoft Entra authentication for the administrator connection and could imply that CREATE USER creates the directory group or managed identity. Clarified that the administrator connects using Microsoft Entra authentication and that the statements create database users for existing directory identities. The SQL statements remain unchanged.

## Review Notes
- Reviewed the C# syntax and documented API signatures, callback cancellation and token expiration handling, credential selection branches, connection-string settings, SQL statements, and CLI command syntax. No code changes were required.
- Both pinned package versions exist. Azure.Identity 1.21.0 satisfies SqlClient 6.1.7's documented Azure.Identity minimum dependency. The ManagedIdentityId constructor and system/user-assigned identity selectors are documented APIs.
- Confirmed callback support begins with SqlClient 5.2, stable callback instances participate in pooling, and identical callback inputs must retain the same security context. The public-cloud scope and single-identity limitation are explicitly stated in the post.
- Confirmed the SqlClient 7.0 packaging change for built-in Entra authentication modes. The tutorial deliberately targets 6.x; future upgrades should review migration guidance.
- The environment setting is application-defined and case-sensitive. All values other than Development select managed identity; AZURE_CLIENT_ID chooses a user-assigned identity when present.
- The SQL probe verifies database/user context, not the SELECT grant on dbo.OrderStatus. Deployment validation should also exercise the application's actual queries.
- Directory lookup permissions, identity assignment, database grants, and network connectivity remain deployment prerequisites. The example assumes existing, resolvable directory names and an existing table.
- Referenced Microsoft documentation links resolve to the intended resources. CLI documentation redirects to current canonical pages where applicable.
- This was a documentation and static code review, not an end-to-end Azure test. The available SDK is .NET 6.0.201; compilation with a supported SDK was not performed. No Azure credentials, managed identity host, or live database were used.
