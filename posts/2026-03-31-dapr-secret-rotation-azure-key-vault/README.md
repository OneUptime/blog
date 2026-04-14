# How to Implement Secret Rotation with Dapr and Azure Key Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Azure Key Vault, Security, Rotation

Description: Learn how to implement secret rotation using Dapr's Azure Key Vault secret store, including event-driven rotation with Azure Event Grid and managed identity authentication.

---

## Azure Key Vault with Dapr

Azure Key Vault provides built-in secret versioning and rotation events. Dapr's Azure Key Vault secret store component reads the latest active version of a secret automatically. Combine this with Azure Event Grid notifications to trigger application-side rotation when a secret changes.

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
  namespace: default
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "mycompany-vault"
  - name: azureClientId
    value: ""               # Leave empty when using managed identity
  - name: azureEnvironment
    value: "AZUREPUBLICCLOUD"
```

For managed identity (recommended in AKS):

```yaml
# Pod identity annotation
metadata:
  annotations:
    azure.workload.identity/client-id: "<managed-identity-client-id>"
```

## Reading Secrets via Dapr

```csharp
using Dapr.Client;

public class DatabaseService
{
    private readonly DaprClient _dapr;
    private string _cachedConnectionString;

    public DatabaseService(DaprClient dapr)
    {
        _dapr = dapr;
    }

    public async Task<string> GetConnectionStringAsync()
    {
        if (_cachedConnectionString != null)
            return _cachedConnectionString;

        var secret = await _dapr.GetSecretAsync("azurekeyvault", "db-connection-string");
        _cachedConnectionString = secret["db-connection-string"];
        return _cachedConnectionString;
    }

    public void InvalidateCache()
    {
        _cachedConnectionString = null;
    }
}
```

## Configuring Automatic Rotation in Azure Key Vault

Set up a rotation policy in Azure Key Vault to automatically rotate secrets:

```bash
# Set a rotation policy for a secret (rotates 30 days before expiry)
az keyvault secret rotation-policy update \
  --vault-name mycompany-vault \
  --name db-password \
  --value '{
    "lifetimeActions": [
      {
        "trigger": {"daysBeforeExpiry": 30},
        "action": {"type": "Rotate"}
      },
      {
        "trigger": {"daysBeforeExpiry": 7},
        "action": {"type": "Notify"}
      }
    ],
    "attributes": {
      "expiryTime": "P90D"
    }
  }'
```

## Subscribing to Rotation Events via Azure Event Grid

Create a webhook endpoint that Azure Event Grid calls when a secret rotates:

```csharp
// Program.cs
app.MapPost("/rotation-webhook", async (HttpContext ctx, DatabaseService db) =>
{
    var events = await JsonSerializer.DeserializeAsync<AzureEventGridEvent[]>(ctx.Request.Body);

    foreach (var e in events ?? Array.Empty<AzureEventGridEvent>())
    {
        // Validation handshake
        if (e.EventType == "Microsoft.EventGrid.SubscriptionValidationEvent")
        {
            var validation = JsonSerializer.Deserialize<ValidationData>(e.Data.ToString());
            return Results.Json(new { validationResponse = validation.ValidationCode });
        }

        if (e.EventType == "Microsoft.KeyVault.SecretNewVersionCreated")
        {
            var secretName = e.Subject.Split('/').Last();
            Console.WriteLine($"Secret rotated: {secretName}");

            // Invalidate cached credentials and reload
            db.InvalidateCache();
            await db.RefreshConnectionPoolAsync();
        }
    }

    return Results.Ok();
});
```

## Setting Up Event Grid Subscription

```bash
# Create Event Grid subscription to call your webhook
az eventgrid event-subscription create \
  --name secret-rotation-sub \
  --source-resource-id /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/mycompany-vault \
  --endpoint https://myapp.example.com/rotation-webhook \
  --event-delivery-schema EventGridSchema \
  --included-event-types Microsoft.KeyVault.SecretNewVersionCreated
```

## Refreshing Secrets in Dapr

```csharp
public async Task RefreshConnectionPoolAsync()
{
    // Clear cached secret to force fresh read from Key Vault
    InvalidateCache();

    // Re-read the new secret version
    var secret = await _dapr.GetSecretAsync("azurekeyvault", "db-connection-string");
    var newConnectionString = secret["db-connection-string"];

    // Rebuild the connection pool with new credentials
    await _connectionPool.ReconfigureAsync(newConnectionString);
    Console.WriteLine("Connection pool refreshed with new credentials");
}
```

## Summary

Dapr with Azure Key Vault enables event-driven secret rotation by reading the latest secret version on demand and using Azure Event Grid to notify your application when a rotation occurs. Use managed identity for authentication, set rotation policies in Key Vault for automatic expiry-based rotation, and implement a rotation webhook to invalidate caches and refresh connection pools without application restarts.
