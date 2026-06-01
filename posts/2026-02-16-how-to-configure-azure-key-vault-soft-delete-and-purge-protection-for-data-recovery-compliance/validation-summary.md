# Validation Summary: How to Configure Azure Key Vault Soft-Delete and Purge Protection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Key Vault
- Azure CLI
- Azure Policy
- Azure Monitor diagnostic settings and activity log alerts
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: Azure Key Vault soft-delete overview: https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview
- Microsoft Learn: Azure Key Vault recovery management with soft delete and purge protection: https://learn.microsoft.com/en-us/azure/key-vault/general/key-vault-recovery
- Microsoft Learn: Azure CLI `az keyvault` reference: https://learn.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest
- Microsoft Learn: Integrate Azure Key Vault with Azure Policy: https://learn.microsoft.com/en-us/azure/key-vault/general/azure-policy
- Microsoft Learn: Azure Policy built-in definitions for Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/policy-reference
- Azure Policy built-in policy source for "Key vaults should have soft delete enabled": https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Key%20Vault/SoftDeleteMustBeEnabled_Audit.json
- Azure Policy built-in policy source for "Key vaults should have deletion protection enabled": https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Key%20Vault/Recoverable_Audit.json
- Microsoft Learn: Enable Key Vault logging: https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging
- Microsoft Learn: Azure Monitor diagnostic settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest
- Microsoft Learn: AzureDiagnostics table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azurediagnostics

## Issues Found
- Corrected the soft-delete default date from February 2023 to September 1, 2019, matching Microsoft documentation for Key Vaults created after that date.
- Removed the unsupported `--enable-soft-delete true` flag from the new-vault `az keyvault create` example because current Azure CLI documentation shows soft-delete is on by default and exposes `--retention-days` and `--enable-purge-protection` for creation.
- Clarified that the soft-delete retention period is set when the vault is created and cannot be changed afterward.
- Removed `--retention-days 90` from the existing-vault update example because retention cannot be changed once configured.
- Corrected the vault recovery note to state that integrated services such as Azure RBAC role assignments and Event Grid subscriptions are not restored automatically after vault recovery.
- Updated the Azure Policy assignment examples to pass `{"effect":{"value":"Deny"}}`, because the built-in Key Vault policies default to `Audit`; without this parameter the examples would not deny noncompliant vault creation.
- Corrected the second policy comment to match the built-in policy used: "Key vaults should have deletion protection enabled."
- Corrected the cost discussion. Microsoft documents that soft-deleted Key Vault objects generally do not incur normal usage charges while deleted; purge and recover actions are billed as normal operations, and HSM-protected key charges can still apply in specific cases.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was verified against the current official Azure CLI reference and Microsoft Learn articles rather than local `az --help` output.
