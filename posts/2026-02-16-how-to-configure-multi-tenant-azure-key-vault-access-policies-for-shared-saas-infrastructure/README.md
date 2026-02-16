# How to Configure Multi-Tenant Azure Key Vault Access Policies for Shared SaaS Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Key Vault, Multi-Tenant, SaaS, Access Policies, Security, RBAC, Secrets Management

Description: Learn how to configure Azure Key Vault access policies for multi-tenant SaaS applications with proper isolation and least-privilege access.

---

Secrets management in a multi-tenant SaaS application is one of those things that seems simple until you actually sit down to design it. Each tenant might have their own API keys, database connection strings, encryption keys, and third-party credentials. You need to store all of these securely, ensure tenants cannot access each other's secrets, and give your application services just enough access to do their job.

Azure Key Vault is the obvious choice for secrets management on Azure, but configuring it for multi-tenant scenarios requires careful thought. Do you use one Key Vault per tenant? One shared Key Vault with naming conventions? How do you handle access policies when multiple services need different levels of access?

In this guide, I will walk through the different approaches and show you how to configure Key Vault access policies that work for a shared SaaS infrastructure.

## Choosing a Key Vault Topology

There are three common approaches, and each has tradeoffs:

**Single Key Vault with naming conventions** - All tenants share one Key Vault. Secrets are prefixed with the tenant ID (e.g., `tenant-001-db-connection`). This is the simplest to manage but offers no built-in isolation between tenants at the vault level.

**Key Vault per tenant** - Each tenant gets their own Key Vault instance. This provides the strongest isolation but creates management overhead and can hit Azure subscription limits (the default is around 1,000 Key Vaults per subscription).

**Pooled Key Vaults** - A middle ground where you spread tenants across a pool of Key Vaults. Each Key Vault serves a batch of tenants. This balances isolation with manageability.

For most SaaS applications, I recommend starting with the single Key Vault approach and moving to pooled vaults as you scale. Here is why: Azure Key Vault supports RBAC at the secret level, which means you can grant access to specific secrets rather than the entire vault. This gives you effective per-tenant isolation without the overhead of managing hundreds of vaults.

## Setting Up the Shared Key Vault

Create the Key Vault with RBAC authorization enabled. This is critical - the older access policy model does not support per-secret permissions:

```bash
# Create the Key Vault with RBAC authorization instead of access policies
az keyvault create \
  --name kv-saas-shared \
  --resource-group rg-saas-app \
  --location eastus \
  --enable-rbac-authorization true \
  --sku standard
```

The `--enable-rbac-authorization true` flag switches Key Vault from the legacy access policy model to Azure RBAC. With RBAC, you can assign roles at the vault level, resource group level, or even individual secret level.

## Naming Convention for Tenant Secrets

Establish a consistent naming convention that encodes the tenant ID into the secret name:

```
{tenantId}--{secretType}--{secretName}
```

For example:
- `tenant-001--database--connection-string`
- `tenant-001--api-key--stripe`
- `tenant-002--database--connection-string`
- `tenant-002--encryption--data-key`

The double-hyphen separator makes it easy to parse the tenant ID from the secret name, and it avoids conflicts with single hyphens in tenant IDs or secret names.

## Configuring RBAC Roles for Application Services

Your application services need different levels of access. The web application needs to read tenant secrets. The provisioning service needs to create and update them. The billing service might only need to read Stripe API keys.

Here is how to assign the appropriate roles:

```bash
# Get the object IDs for your managed identities
WEB_APP_ID=$(az webapp identity show \
  --name my-saas-app \
  --resource-group rg-saas-app \
  --query principalId -o tsv)

PROVISIONING_FUNC_ID=$(az functionapp identity show \
  --name func-tenant-provisioning \
  --resource-group rg-saas-app \
  --query principalId -o tsv)

BILLING_FUNC_ID=$(az functionapp identity show \
  --name func-billing \
  --resource-group rg-saas-app \
  --query principalId -o tsv)

# Grant the web app read-only access to secrets
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $WEB_APP_ID \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-saas-app/providers/Microsoft.KeyVault/vaults/kv-saas-shared"

# Grant the provisioning function full secret management
az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee $PROVISIONING_FUNC_ID \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-saas-app/providers/Microsoft.KeyVault/vaults/kv-saas-shared"

# Grant the billing function read-only access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $BILLING_FUNC_ID \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-saas-app/providers/Microsoft.KeyVault/vaults/kv-saas-shared"
```

## Building a Tenant-Scoped Secret Access Layer

Even though RBAC controls who can access the vault, your application code needs to enforce that a service only reads secrets belonging to the current tenant. Build a wrapper around the Key Vault SDK:

```csharp
// Service that provides tenant-scoped access to Key Vault secrets
public class TenantSecretService
{
    private readonly SecretClient _secretClient;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<TenantSecretService> _logger;

    public TenantSecretService(
        SecretClient secretClient,
        ITenantContext tenantContext,
        ILogger<TenantSecretService> logger)
    {
        _secretClient = secretClient;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    // Read a secret that belongs to the current tenant
    public async Task<string> GetSecretAsync(string secretType, string secretName)
    {
        var tenantId = _tenantContext.CurrentTenantId;
        var fullSecretName = $"{tenantId}--{secretType}--{secretName}";

        try
        {
            var secret = await _secretClient.GetSecretAsync(fullSecretName);
            return secret.Value.Value;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            _logger.LogWarning(
                "Secret not found: {SecretName} for tenant {TenantId}",
                fullSecretName, tenantId);
            return null;
        }
    }

    // Store a secret for the current tenant
    public async Task SetSecretAsync(
        string secretType, string secretName, string value,
        DateTimeOffset? expiresOn = null)
    {
        var tenantId = _tenantContext.CurrentTenantId;
        var fullSecretName = $"{tenantId}--{secretType}--{secretName}";

        var secret = new KeyVaultSecret(fullSecretName, value);

        // Add tenant metadata as tags for easier management
        secret.Properties.Tags["tenantId"] = tenantId;
        secret.Properties.Tags["secretType"] = secretType;
        secret.Properties.Tags["createdBy"] = "tenant-provisioning";

        if (expiresOn.HasValue)
        {
            secret.Properties.ExpiresOn = expiresOn.Value;
        }

        await _secretClient.SetSecretAsync(secret);

        _logger.LogInformation(
            "Secret stored: {SecretName} for tenant {TenantId}",
            fullSecretName, tenantId);
    }

    // List all secrets belonging to the current tenant
    public async Task<List<SecretInfo>> ListSecretsAsync()
    {
        var tenantId = _tenantContext.CurrentTenantId;
        var prefix = $"{tenantId}--";
        var secrets = new List<SecretInfo>();

        await foreach (var secretProperties in _secretClient.GetPropertiesOfSecretsAsync())
        {
            if (secretProperties.Name.StartsWith(prefix))
            {
                // Parse the secret name components
                var parts = secretProperties.Name.Split("--", 3);
                secrets.Add(new SecretInfo
                {
                    SecretType = parts.Length > 1 ? parts[1] : "unknown",
                    SecretName = parts.Length > 2 ? parts[2] : "unknown",
                    CreatedOn = secretProperties.CreatedOn,
                    ExpiresOn = secretProperties.ExpiresOn,
                    Enabled = secretProperties.Enabled ?? true
                });
            }
        }

        return secrets;
    }
}
```

## Tenant Provisioning - Creating Secrets for New Tenants

When a new tenant signs up, the provisioning service creates their initial secrets:

```csharp
// Service that provisions secrets for new tenants
public class TenantProvisioningService
{
    private readonly SecretClient _secretClient;
    private readonly ILogger<TenantProvisioningService> _logger;

    public TenantProvisioningService(
        SecretClient secretClient,
        ILogger<TenantProvisioningService> logger)
    {
        _secretClient = secretClient;
        _logger = logger;
    }

    public async Task ProvisionTenantSecretsAsync(string tenantId, TenantConfig config)
    {
        // Generate a unique encryption key for the tenant
        var encryptionKey = GenerateRandomKey(256);
        await StoreSecret(tenantId, "encryption", "data-key", encryptionKey);

        // Store the tenant-specific database connection string
        var connectionString = BuildTenantConnectionString(tenantId, config);
        await StoreSecret(tenantId, "database", "connection-string", connectionString);

        // Generate an API key for the tenant's external integrations
        var apiKey = GenerateApiKey();
        await StoreSecret(tenantId, "api-key", "primary", apiKey);

        _logger.LogInformation("Provisioned secrets for new tenant: {TenantId}", tenantId);
    }

    private async Task StoreSecret(
        string tenantId, string secretType, string secretName, string value)
    {
        var fullName = $"{tenantId}--{secretType}--{secretName}";
        var secret = new KeyVaultSecret(fullName, value);
        secret.Properties.Tags["tenantId"] = tenantId;
        secret.Properties.Tags["secretType"] = secretType;

        await _secretClient.SetSecretAsync(secret);
    }

    private string GenerateRandomKey(int bits)
    {
        var bytes = new byte[bits / 8];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private string GenerateApiKey()
    {
        return $"sk_{Guid.NewGuid():N}";
    }

    private string BuildTenantConnectionString(string tenantId, TenantConfig config)
    {
        return $"Server=tcp:{config.SqlServerName}.database.windows.net,1433;" +
               $"Database={config.DatabaseName};" +
               $"User ID={tenantId}-user;" +
               $"Encrypt=True;TrustServerCertificate=False;";
    }
}
```

## Secret Rotation

Secrets should not last forever. Build a rotation mechanism that updates secrets on a schedule:

```csharp
// Scheduled function that rotates tenant encryption keys
[FunctionName("RotateTenantSecrets")]
public async Task RotateSecrets(
    [TimerTrigger("0 0 3 1 */3 *")] TimerInfo timer, // Every 3 months
    ILogger log)
{
    // List all secrets and find encryption keys older than 90 days
    await foreach (var secret in _secretClient.GetPropertiesOfSecretsAsync())
    {
        if (secret.Name.Contains("--encryption--") &&
            secret.CreatedOn < DateTimeOffset.UtcNow.AddDays(-90))
        {
            var tenantId = secret.Name.Split("--")[0];

            // Generate a new key
            var newKey = GenerateRandomKey(256);

            // Store it as a new version (Key Vault handles versioning)
            await _secretClient.SetSecretAsync(secret.Name, newKey);

            log.LogInformation(
                "Rotated encryption key for tenant {TenantId}", tenantId);
        }
    }
}
```

## Caching Secrets Locally

Hitting Key Vault on every request adds latency and costs money (Key Vault charges per operation). Use a local cache with a reasonable TTL:

```csharp
// Caching wrapper around the tenant secret service
public class CachedTenantSecretService : TenantSecretService
{
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(15);

    public CachedTenantSecretService(
        SecretClient secretClient,
        ITenantContext tenantContext,
        IMemoryCache cache,
        ILogger<CachedTenantSecretService> logger)
        : base(secretClient, tenantContext, logger)
    {
        _cache = cache;
    }

    public new async Task<string> GetSecretAsync(string secretType, string secretName)
    {
        var cacheKey = $"secret:{secretType}:{secretName}";

        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = _cacheDuration;
            return await base.GetSecretAsync(secretType, secretName);
        });
    }
}
```

## Monitoring and Auditing

Enable Key Vault diagnostic logging to track who accessed what:

```bash
# Enable diagnostic logging for the Key Vault
az monitor diagnostic-settings create \
  --name kv-audit-logs \
  --resource "/subscriptions/{sub-id}/resourceGroups/rg-saas-app/providers/Microsoft.KeyVault/vaults/kv-saas-shared" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/rg-saas-app/providers/Microsoft.OperationalInsights/workspaces/log-saas-app" \
  --logs '[{"category":"AuditEvent","enabled":true,"retentionPolicy":{"enabled":true,"days":365}}]'
```

This sends all Key Vault access events to Log Analytics, where you can query them to detect unauthorized access attempts or unusual patterns.

## Wrapping Up

Configuring Azure Key Vault for multi-tenant SaaS is about finding the right balance between isolation and manageability. The shared Key Vault with RBAC authorization gives you fine-grained access control without the overhead of managing hundreds of individual vaults. A consistent naming convention with tenant ID prefixes makes it easy to scope access in your application code. And by layering in local caching, secret rotation, and audit logging, you build a secrets management system that is both secure and operationally practical. Start with the simple approach and evolve it as your tenant count grows and your compliance requirements tighten.
