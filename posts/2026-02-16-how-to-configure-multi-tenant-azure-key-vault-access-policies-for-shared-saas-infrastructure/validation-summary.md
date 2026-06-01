# Validation Summary: How to Configure Multi-Tenant Azure Key Vault Access Policies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Key Vault
- Azure Key Vault Azure RBAC authorization
- Azure CLI
- Azure Managed Identities for App Service and Azure Functions
- Azure.Security.KeyVault.Secrets .NET SDK
- Azure Functions TimerTrigger
- Azure Monitor diagnostic settings and Log Analytics
- ASP.NET Core IMemoryCache

## Sources Consulted
- Microsoft Learn: Provide access to Key Vault keys, certificates, and secrets with Azure role-based access control: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure Key Vault service limits: https://learn.microsoft.com/en-us/azure/key-vault/general/service-limits
- Microsoft Learn: Quickstart - Create an Azure Key Vault with the Azure CLI: https://learn.microsoft.com/en-us/azure/key-vault/general/quick-create-cli
- Microsoft Learn: Assign Azure roles using Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: az role assignment CLI reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Azure Key Vault secret client library for .NET: https://learn.microsoft.com/en-us/dotnet/api/overview/azure/security.keyvault.secrets-readme
- Microsoft Learn: SecretClient.GetPropertiesOfSecretsAsync API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.security.keyvault.secrets.secretclient.getpropertiesofsecretsasync
- Microsoft Learn: SecretProperties API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.security.keyvault.secrets.secretproperties
- Microsoft Learn: SecretProperties.CreatedOn API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.security.keyvault.secrets.secretproperties.createdon
- Microsoft Learn: Timer trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
- Microsoft Learn: Enable Azure Key Vault logging: https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging
- Microsoft Learn: az monitor diagnostic-settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The post claimed that a per-tenant Key Vault design can hit a default limit of around 1,000 Key Vaults per subscription. Microsoft Key Vault service limits do not document a fixed Key Vault count limit like this; the relevant practical constraints are resource organization, deployment, monitoring, and Azure resource limits. Updated the wording to avoid the inaccurate quota.
- The post presented secret-level RBAC as a general way to get effective per-tenant isolation in a shared vault. Azure Key Vault does support individual secret scopes, but Microsoft recommends individual key/secret/certificate role assignments only for limited scenarios. Updated the recommendation to clarify that shared vaults still require application-level tenant enforcement and that pooled or per-tenant vaults are appropriate for stronger isolation.
- The `TenantSecretService` caching wrapper used `new` to hide `GetSecretAsync` rather than overriding it. This could bypass caching when the service is referenced through the base type. Changed the base method to `virtual` and the cached method to `override`.
- The cache key omitted the tenant ID, which could return one tenant's cached secret for another tenant when the same `secretType` and `secretName` are requested. Added the current tenant ID to the cache key and made the tenant context accessible to the derived class.
- The rotation sample compared `SecretProperties.CreatedOn` directly with a `DateTimeOffset`. In the .NET SDK this property is nullable, so the sample would not compile as written. Added `HasValue` and `.Value` checks before comparing.
- The diagnostic settings command included an inline `retentionPolicy` while routing to Log Analytics. The official Key Vault logging examples create the Log Analytics diagnostic setting with the `AuditEvent` category, and Log Analytics retention is handled separately. Removed the inline retention policy from the create command.

## Review Notes
The Azure CLI and .NET SDK were not installed in the local workspace, so command and API verification was performed against official Microsoft documentation rather than local `az --help` or compilation. The Azure Functions timer example uses the in-process C# model; Microsoft documentation notes that in-process support ends on November 10, 2026, so a future update should consider showing the isolated worker model.
