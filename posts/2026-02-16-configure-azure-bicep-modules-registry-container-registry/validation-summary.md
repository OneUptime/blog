# Validation Summary: How to Configure Azure Bicep Modules Registry Using Azure Container Registry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bicep
- Azure Container Registry
- Azure CLI
- Azure RBAC
- GitHub Actions
- Azure Login GitHub Action

## Sources Consulted
- Azure Bicep modules: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/modules
- Bicep CLI commands and `az bicep publish`: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-cli
- Azure CLI `az bicep publish` reference: https://learn.microsoft.com/en-us/cli/azure/bicep
- Bicep module aliases in `bicepconfig.json`: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-config-modules
- Azure Container Registry RBAC built-in roles: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview
- Azure Container Registry retention policy: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy
- Azure Container Registry overview and service tiers: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-intro
- `Microsoft.ContainerRegistry/registries` Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.containerregistry/registries
- `Microsoft.Storage/storageAccounts@2023-01-01` Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Azure Storage redundancy support: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Azure Login GitHub Action documentation: https://github.com/Azure/login

## Issues Found
- The ACR Bicep example enabled `retentionPolicy` while using the Standard SKU. Azure Container Registry retention policy for untagged manifests is a Premium-tier preview feature, so the Standard example could fail or mislead readers. Removed the `retentionPolicy` block from the Standard registry template.
- The storage account module allowed `accountTier` values of both `Standard` and `Premium` while independently allowing `GRS`, `ZRS`, and `RAGRS` replication values. That could produce invalid SKUs such as `Premium_GRS` for a `StorageV2` account. Limited the module example to the `Standard` tier, which keeps the shown replication values valid.
- The alias comparison snippet used `{ ... }` in a Bicep code block, which is not valid Bicep syntax. Replaced it with minimal valid module declarations.

## Review Notes
- Azure CLI was not installed in the local workspace, so CLI command validation was performed against Microsoft Learn command references rather than local `az --help` output.
- The GitHub Actions workflow assumes the Azure identity already has a federated identity credential configured for GitHub OIDC and has `AcrPush` on the registry scope.
