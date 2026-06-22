# Validation Summary: How to Configure Azure Key Vault

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure Key Vault
- Azure CLI
- Azure RBAC and Key Vault access policies
- Managed identities
- Azure SDK for Python
- Azure SDK for .NET / ASP.NET Core configuration provider
- Azure SDK for JavaScript / Node.js
- Azure App Service Key Vault references
- Azure Private Link and private DNS
- Azure Monitor diagnostic settings
- Azure Event Grid

## Sources Consulted
- Microsoft Learn: Azure Key Vault keys, secrets, and certificates overview - https://learn.microsoft.com/en-us/azure/key-vault/general/about-keys-secrets-certificates
- Microsoft Learn: Azure CLI `az keyvault create`, `update`, and `set-policy` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az keyvault secret` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/secret?view=azure-cli-latest
- Microsoft Learn: Azure Key Vault soft-delete overview - https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview
- Microsoft Learn: Azure Key Vault RBAC guide - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure built-in roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn: Azure Key Vault logging - https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging
- Microsoft Learn: Azure Key Vault Secrets client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/keyvault-secrets-readme
- Microsoft Learn: Azure Key Vault Secret client library for JavaScript - https://learn.microsoft.com/en-us/javascript/api/overview/azure/keyvault-secrets-readme
- Microsoft Learn: Azure Key Vault configuration provider in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/key-vault-configuration
- Microsoft Learn: App Service Key Vault references - https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Microsoft Learn: Azure Private Endpoint DNS configuration - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Integrate Key Vault with Azure Private Link - https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service
- Microsoft Learn: Azure CLI private endpoint and DNS zone group references - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint and https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Azure Key Vault as Event Grid source - https://learn.microsoft.com/en-us/azure/event-grid/event-schema-key-vault

## Issues Found
- The access-policy Key Vault creation example used `--enable-soft-delete true`, which is not present in the current `az keyvault create` reference. Soft delete is on by default for new vaults and cannot be disabled once enabled, so I replaced the flag with current purge-protection and retention-day options.
- The `ApiKey` example used an expiration date of `2025-12-31T23:59:59Z`, which is already in the past as of this validation date. I updated it to `2027-12-31T23:59:59Z`.
- The manual rotation comment said applications using the latest version automatically get the new value. That is accurate for code that fetches the latest version, but App Service Key Vault references cache values and refresh automatically within 24 hours. I clarified the comment.

## Review Notes
The Azure CLI commands, RBAC role names, access policy permissions, SDK usage patterns, App Service Key Vault reference syntax, private endpoint DNS zone, and Event Grid event type were otherwise consistent with current Microsoft documentation. The Azure CLI was not installed in the local workspace, so CLI validation was performed against Microsoft Learn command references rather than local `az --help` output.
