# Prevent Managed Identity Tokens from Fragmenting Azure SQL Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Managed Identity, Connection Pooling, .NET, Authentication

Description: Keep Azure SQL pools stable with driver-managed identity authentication or a shared token callback, while preserving identity boundaries and token refresh.

---

A managed identity removes an application password, but it does not remove connection-pool design. If an application assigns a freshly acquired token to `SqlConnection.AccessToken`, token changes can create separate pools. If it creates a new callback instance for every connection, the callback itself can fragment pools too.

Use either SqlClient's managed identity authentication mode or a stable `AccessTokenCallback`. Keep the identity, connection string, and callback lifecycle deliberate.

## Prefer the driver-managed path when it fits

For a system-assigned managed identity on an Azure resource that exposes managed identity credentials, use a stable connection string:

```text
Server=tcp:orders-prod.database.windows.net,1433;Database=orders;Authentication=Active Directory Managed Identity;Encrypt=True;TrustServerCertificate=False;Application Name=orders-api;Max Pool Size=40;
```

For a user-assigned identity with SqlClient 3.0 or later, add `User Id=<managed-identity-client-id>`. Use the identity's client ID for this driver selection, not its object/principal ID. Assign the identity to the hosting resource and create the corresponding database user separately.

Microsoft.Data.SqlClient 7.0 moved built-in Microsoft Entra authentication support to `Microsoft.Data.SqlClient.Extensions.Azure`. Applications using the driver's `Authentication=Active Directory ...` modes must include that extension. Custom token and token-callback implementations do not require the extension solely for passing their own tokens.

The driver-managed path avoids application code that copies a token into each connection. It still needs consistent connection strings and correct disposal. Do not set `AccessToken` alongside an authentication mode that already acquires credentials.

## Understand the two fragmentation traps

`AccessToken` participates in pool identity. Rotating that string can produce a new pool while earlier pools remain. A high minimum pool size can make the resulting physical-session growth especially visible.

`AccessTokenCallback` also participates in the pool key. Recreating closures on every request can separate otherwise equivalent connections. The callback must return the same security context for equivalent inputs: making it consult a mutable current-user field can accidentally reuse a connection authenticated as a different identity.

This distinction matters for multi-tenant services. Pool reuse is an optimization within an identity boundary. It must never erase that boundary.

## Use one credential and callback for one application identity

The following complete helper targets Microsoft.Data.SqlClient 5.2 or later and Azure.Identity 1.21.0. It demonstrates one system-assigned managed identity; the host must provide that identity. The project uses implicit system usings.

```csharp
using Azure.Core;
using Azure.Identity;
using Microsoft.Data.SqlClient;

public static class ManagedSqlConnections
{
    private static readonly TokenCredential Credential =
        new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);

    private static readonly Func<SqlAuthenticationParameters,
        CancellationToken, Task<SqlAuthenticationToken>> Callback =
        AcquireTokenAsync;

    private static async Task<SqlAuthenticationToken> AcquireTokenAsync(
        SqlAuthenticationParameters parameters,
        CancellationToken cancellationToken)
    {
        string resource = parameters.Resource;
        string scope = resource.EndsWith("/.default", StringComparison.Ordinal)
            ? resource
            : resource.TrimEnd('/') + "/.default";

        AccessToken token = await Credential.GetTokenAsync(
            new TokenRequestContext(new[] { scope }), cancellationToken);
        return new SqlAuthenticationToken(token.Token, token.ExpiresOn);
    }

    public static SqlConnection Create()
    {
        return new SqlConnection(
            "Server=tcp:orders-prod.database.windows.net,1433;" +
            "Database=orders;Encrypt=True;TrustServerCertificate=False;" +
            "Application Name=orders-api;Max Pool Size=40;")
        {
            AccessTokenCallback = Callback
        };
    }
}
```

The callback receives the resource from SqlClient and returns both the token and its expiration. The credential and delegate are retained for the application lifetime. The connection string deliberately omits `Authentication`, `User Id`, and a password because this helper supplies the identity through the callback.

Callers still own each connection:

```csharp
await using var connection = ManagedSqlConnections.Create();
await connection.OpenAsync(cancellationToken);
// Execute and dispose commands/readers before leaving this scope.
```

Do not cache an open `SqlConnection` as the singleton. Cache the credential and callback; create short-lived connection objects that return physical connections to the pool.

For multiple managed identities, build a bounded, immutable mapping from identity to credential and stable callback. Keep each identity's pool key distinct, and reject unexpected identity selectors. Do not modify this single-identity helper to switch credentials using ambient request state.

## Verify refresh without logging credentials

Record process instance, a safe identity identifier, pool configuration version, active connection usage, and database session counts. Never log access tokens or a complete connection string that might contain a secret in another deployment.

Run steady traffic across token-refresh periods and through cancellations. Session counts should settle around workload demand rather than increasing with every refresh or every request. Compare before and after a rolling deployment, because old and new processes legitimately maintain separate pools while both are alive.

If the application previously used `AccessToken`, remove the old path consistently. A partial rollout can leave both strategies active. Clearing pools may help a controlled migration, but clearing on every token refresh throws away pooling and creates unnecessary login work.

## Conclusion

Stable pooling requires stable identity inputs and callback instances. Let SqlClient manage managed identity authentication where possible, or retain one credential and callback per intended security context while disposing connections normally.

## Official Documentation

- [Microsoft Entra authentication and AccessTokenCallback](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
- [SqlConnection.AccessToken and pooling](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstoken?view=sqlclient-dotnet-core-6.1)
- [SqlConnection.AccessTokenCallback](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstokencallback?view=sqlclient-dotnet-core-6.1)
- [ManagedIdentityCredential](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.managedidentitycredential)
- [SqlClient connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
