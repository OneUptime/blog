# Validation Summary: How to Configure Environment Variables and Secrets in Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Azure CLI
- Azure Key Vault
- Managed identities
- Azure RBAC
- Bicep / ARM templates
- JavaScript environment variables

## Sources Consulted
- Microsoft Learn: Manage secrets in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets
- Microsoft Learn: Azure CLI `az containerapp`: https://learn.microsoft.com/en-us/cli/azure/containerapp?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az containerapp secret`: https://learn.microsoft.com/en-us/cli/azure/containerapp/secret?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az containerapp revision`: https://learn.microsoft.com/en-us/cli/azure/containerapp/revision?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az keyvault`: https://learn.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest
- Microsoft Learn: Managed identities in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity
- Microsoft Learn: Microsoft.App/containerApps ARM/Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.app/2025-02-02-preview/containerapps
- Microsoft Learn: Grant permission to applications to access an Azure key vault using Azure RBAC: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide

## Issues Found
- The comment above the `--remove-env-vars` example said to remove an environment variable by setting it to empty. The command uses the dedicated `--remove-env-vars` option, so the comment was corrected.
- The post said updated direct Container Apps secrets can take effect when the app scales up and new replicas are created. Current Azure Container Apps documentation says updated or deleted app-level secrets do not automatically affect existing revisions; deploy a new revision or restart an existing revision. The scale-up bullet was removed.
- The Key Vault access example used `az keyvault set-policy`. Current Azure Container Apps documentation recommends granting the managed identity the Azure RBAC `Key Vault Secrets User` role, and current Key Vault CLI documentation creates RBAC-enabled vaults by default. The Key Vault creation and access commands were updated to use RBAC, including a `Key Vault Secrets Officer` assignment for the caller before setting the sample secrets.
- The best-practice guidance said to create a new revision when updating a Key Vault secret. Current documentation states versionless Key Vault secret URIs automatically retrieve newer versions within 30 minutes and restart active revisions that reference the secret in an environment variable. The guidance was updated to distinguish inline Container Apps secrets from Key Vault references.
- The troubleshooting guidance referred only to the `get` permission on Key Vault secrets. It was updated to check for the `Key Vault Secrets User` role, matching current Microsoft guidance.

## Review Notes
The Azure CLI examples for `--env-vars`, `--set-env-vars`, `--remove-env-vars`, `--secrets`, `secretref:`, `keyvaultref:`, `identityref:system`, and `az containerapp revision copy` match current Azure CLI documentation. The Bicep fields `configuration.secrets[].keyVaultUrl`, `configuration.secrets[].identity`, and container `env[].secretRef` match the current ARM/Bicep schema. The local environment did not have the Azure CLI installed, so CLI validation was performed against Microsoft Learn rather than local `az --help` output.
