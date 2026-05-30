# Validation Summary: How to Use Azure Bicep Registry to Share Modules Across Teams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bicep
- Bicep private module registry
- Azure Container Registry
- Azure CLI
- Azure role-based access control
- Azure DevOps Pipelines
- Azure Storage account resources

## Sources Consulted
- Microsoft Learn: Bicep modules: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/modules
- Microsoft Learn: Create a private container registry for Bicep modules: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/private-module-registry
- Microsoft Learn: Bicep CLI commands: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-cli
- Microsoft Learn: Azure CLI `az bicep publish`: https://learn.microsoft.com/en-us/cli/azure/bicep?view=azure-cli-latest
- Microsoft Learn: Bicep config module aliases and credentials: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-config-modules
- Microsoft Learn: Azure Container Registry authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn: Azure Container Registry CLI reference: https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest
- Microsoft Learn: Microsoft.Storage/storageAccounts ARM/Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts

## Issues Found
- The documentation URI publish example reused the `1.1.0` tag immediately after publishing it. Azure CLI exposes `--force` for overwriting an existing Bicep module version, so the example could fail if run as written. Changed the documentation URI example to publish `1.1.1`.
- The consuming module example accepted any `environment` string and used it directly in the storage account name. Azure Storage account names must be lowercase, alphanumeric, and 3-24 characters, so values such as `production` could make the generated name too long. Added an allowed set of `dev`, `test`, and `prod`, and updated the production SKU condition to use `prod`.
- The Azure DevOps pipeline detected changed modules but then published every module under `modules/*/`. Updated the detection step to store a space-separated changed-module list and changed the publish step to publish only those modules.
- The local development section used `az acr login` as the authentication step for Bicep restore/deployment. Bicep documentation states that Bicep uses Azure CLI credentials by default for private registry restore operations. Changed the example to use `az login`.

## Review Notes
The local environment did not have Azure CLI or Bicep CLI installed, so command behavior was verified against current Microsoft Learn documentation rather than local `az --help` output. The private registry documentation also notes that `azureADAuthenticationAsArmPolicy` must be enabled for Bicep module publishing; this is the default for ACR, but organizations that disable ARM-audience token authentication would need to re-enable it for this workflow.
