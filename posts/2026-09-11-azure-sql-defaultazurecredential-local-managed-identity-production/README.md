# Use DefaultAzureCredential Locally and Managed Identity for Azure SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Managed Identity, Authentication, .NET, Azure

Description: Use developer credentials locally and a deterministic managed identity in production, with a reusable SqlClient token callback and separate database grants.

---

A developer and a deployed application should be able to use the same database-access code without sharing a password. They should also have different identities and permissions. `DefaultAzureCredential` is convenient on a workstation, while an explicit managed identity gives a deployed service a predictable authentication path.

Microsoft.Data.SqlClient supports both connection-string authentication and a token callback. This walkthrough uses the callback because it makes environment selection explicit and lets the driver request refreshed tokens when establishing pooled connections.

## Choose the appropriate authentication interface

For a small application, the connection string can contain `Authentication=Active Directory Default`. SqlClient then uses `DefaultAzureCredential` through its identity integration. Microsoft's [.NET quickstart](https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-sql-dotnet-quickstart?view=azuresql) demonstrates that approach.

For production, Microsoft's [Azure Identity guidance](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/best-practices) recommends a deterministic credential. An unexpected environment credential or developer CLI login should not silently become the production service's identity.

The implementation below chooses a credential once when the connection factory initializes. It uses `DefaultAzureCredential` only when `APP_ENVIRONMENT=Development`, and a specific `ManagedIdentityCredential` otherwise. This variable is an example application setting, not a built-in Azure convention.

## Provision both database principals

Configure the logical server's Entra administrator and connect directly to the application database using Microsoft Entra authentication as an authorized administrator. Create database users for an existing development group and production managed identity:

```sql
CREATE USER [orders-developers] FROM EXTERNAL PROVIDER;
CREATE USER [orders-api-identity] FROM EXTERNAL PROVIDER;

GRANT SELECT ON OBJECT::dbo.OrderStatus TO [orders-developers];
GRANT SELECT ON OBJECT::dbo.OrderStatus TO [orders-api-identity];
```

Use your actual Entra group, identity, and existing table names. Add write or procedure-execution rights only where required. Group membership gives developers a manageable access path; the deployed application does not inherit those memberships simply because it uses the same source code.

Assign the production identity to the application host. Record its client ID for credential selection. Database user creation resolves the identity's directory object; keep that principal ID separate from the client ID used by the application.

## Build a reusable connection factory

Use a supported .NET SDK with compatible `Azure.Identity` and `Microsoft.Data.SqlClient` packages. This example pins a 6.x SqlClient release to make the package behavior explicit; adopt the current servicing release approved for your application. SqlClient 7.x changes Entra authentication packaging, so review its migration guidance before upgrading. `AccessTokenCallback` requires Microsoft.Data.SqlClient 5.2 or later. The `ManagedIdentityId` API shown below requires an Azure.Identity version that exposes that API.

```bash
dotnet new console --name SqlIdentityDemo
cd SqlIdentityDemo
dotnet add package Azure.Identity --version 1.21.0
dotnet add package Microsoft.Data.SqlClient --version 6.1.7
```

Replace `Program.cs` with:

```csharp
using Azure.Core;
using Azure.Identity;
using Microsoft.Data.SqlClient;

using var connection = SqlConnections.Create();
await connection.OpenAsync();
using var command = connection.CreateCommand();
command.CommandText = "SELECT DB_NAME() + N' / ' + USER_NAME();";
Console.WriteLine(await command.ExecuteScalarAsync());

static class SqlConnections
{
    private static readonly TokenCredential Credential = CreateCredential();

    private static readonly Func<SqlAuthenticationParameters,
        CancellationToken, Task<SqlAuthenticationToken>> GetToken =
        async (_, cancellationToken) =>
        {
            var token = await Credential.GetTokenAsync(
                new TokenRequestContext(
                    new[] { "https://database.windows.net/.default" }),
                cancellationToken);
            return new SqlAuthenticationToken(token.Token, token.ExpiresOn);
        };

    private static TokenCredential CreateCredential()
    {
        if (Environment.GetEnvironmentVariable("APP_ENVIRONMENT") == "Development")
            return new DefaultAzureCredential();

        var clientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID");
        return string.IsNullOrWhiteSpace(clientId)
            ? new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned)
            : new ManagedIdentityCredential(
                ManagedIdentityId.FromUserAssignedClientId(clientId));
    }

    public static SqlConnection Create()
    {
        var connectionString = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")
            ?? throw new InvalidOperationException("SQL_CONNECTION_STRING is required.");
        return new SqlConnection(connectionString)
        {
            AccessTokenCallback = GetToken
        };
    }
}
```

The factory is intentionally for one process-level security identity. Do not modify it to choose an end user's identity from request-local state while sharing the callback and pool. SqlClient requires a consistent security context for the same callback inputs.

Keep `Authentication`, `Password`, and `Integrated Security` out of this callback-based connection string. Supplying another authentication mechanism alongside the callback can produce conflicting configuration. The hard-coded scope is for Azure public cloud; use the appropriate SQL resource and authority when targeting another Azure cloud.

## Configure and verify local development

Sign in to the intended tenant:

```bash
az login --tenant '<tenant-id>'
export APP_ENVIRONMENT=Development
export SQL_CONNECTION_STRING='Server=tcp:orders-prod.database.windows.net,1433;Database=orders;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Application Name=orders-api;'
dotnet run
```

The development credential chain can also discover credentials from supported IDEs and environment variables. Verify which account was selected instead of assuming the most recent `az login` always wins. Remove stale development credentials or constrain the chain when a team requires a particular tool.

The output should identify the intended database and a user authorized through the developer principal or group. Private networking still needs to work from the workstation, normally through the organization's established VPN and DNS setup.

## Configure production and preserve pooling

Set `APP_ENVIRONMENT=Production` and, for a user-assigned identity, set `AZURE_CLIENT_ID` to that identity's client ID. Omit the client ID only when system-assigned identity is the deliberate deployment choice. Retain the same non-secret SQL connection string.

Both the credential and callback are static so their instances are reused. The credential can reuse cached tokens, and the callback remains stable as part of SqlClient's pool key. A callback constructed separately for each request can fragment pools.

Passing `ExpiresOn` to `SqlAuthenticationToken` lets the driver work with token lifetime. Do not replace this with one access token captured at process startup and reused indefinitely. Token refresh authenticates new physical connections; it does not mean every query needs a new token.

## Conclusion

Keep development convenience and production identity selection explicit. Separate database grants for developers and applications, reuse the credential and callback, and verify the actual database user from both environments before relying on the configuration.

## Official Documentation

- [Azure SQL .NET quickstart](https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-sql-dotnet-quickstart?view=azuresql)
- [Azure Identity authentication best practices](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/best-practices)
- [SqlClient token callback behavior](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17#using-accesstokencallback)
- [AccessTokenCallback API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstokencallback?view=sqlclient-dotnet-core-6.0)
- [Configure database identities](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure?view=azuresql)
