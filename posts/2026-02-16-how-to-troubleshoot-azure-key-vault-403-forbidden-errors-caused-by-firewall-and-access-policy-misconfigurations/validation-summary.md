# Validation Summary: How to Troubleshoot Azure Key Vault 403 Forbidden Errors Caused by Firewall

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Key Vault
- Azure Key Vault firewall and network ACLs
- Azure Key Vault access policies
- Azure RBAC for Key Vault
- Azure CLI
- Azure Monitor diagnostic logs and Kusto Query Language
- Azure App Service managed identities
- Azure DevOps pipelines
- Terraform with Azure Key Vault

## Sources Consulted
- Microsoft Learn: Configure network security for Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/network-security
- Microsoft Learn: Azure CLI `az keyvault network-rule` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/network-rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az keyvault` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest
- Microsoft Learn: Assign an Azure Key Vault access policy - https://learn.microsoft.com/en-us/azure/key-vault/general/assign-access-policy
- Microsoft Learn: Provide access to Key Vault with Azure RBAC - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Use managed identities for App Service and Azure Functions - https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Microsoft Learn: Azure Key Vault logging - https://learn.microsoft.com/en-us/azure/key-vault/general/logging
- Microsoft Learn: AzureDiagnostics table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azurediagnostics
- Microsoft Learn: Supported logs for Microsoft.KeyVault/vaults - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-keyvault-vaults-logs
- Microsoft Learn: Azure Key Vault soft-delete overview - https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview

## Issues Found
- The introduction listed soft-delete and purge protection as general sources of Key Vault 403 errors, but the post only troubleshoots firewall and authorization failures. I removed that phrase to avoid implying soft-delete is one of the normal read-access control layers covered by the guide.
- The diagnostic log query projected `identity_claim_upn_s`, which is not listed in the official AzureDiagnostics table reference. I replaced it with `identity_claim_ipaddr_s`, which is documented, and softened the surrounding claim because `identity_claim_appid_g` is only present when that claim is emitted.
- The App Service scenario said slot swaps or redeployments can change the managed identity object ID. Microsoft documents managed identity configuration as slot-specific and system-assigned identities as deleted when removed or when the app resource is deleted. I changed the scenario to identity changes caused by slot-specific configuration, disabling/re-enabling the system-assigned identity, or recreating the app.

## Review Notes
- Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI references instead of local `az --help` output.
- Microsoft Learn currently notes that Azure RBAC is enabled by default for newly created vaults starting with API version 2026-02-01. The post remains accurate because it tells readers to check `properties.enableRbacAuthorization` before choosing access policy or RBAC troubleshooting steps.
