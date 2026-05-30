# Validation Summary: How to Set Up Linked ARM Templates for Modular Infrastructure Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Resource Manager templates
- Linked ARM templates
- Microsoft.Resources/deployments
- Azure Storage accounts and Blob Storage
- Azure CLI
- Azure template specs
- Azure Pipelines

## Sources Consulted
- Azure Resource Manager linked and nested templates: https://learn.microsoft.com/azure/azure-resource-manager/templates/linked-templates
- Microsoft.Resources/deployments template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.resources/2025-03-01/deployments
- ARM template outputs and linked template output references: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/outputs
- ARM template syntax and dependencies: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/syntax
- Azure Storage account naming rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Microsoft.Storage/storageAccounts 2023-01-01 template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Azure CLI az storage account reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI az storage blob upload-batch reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Azure CLI az storage container generate-sas guidance: https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli
- Azure CLI az deployment group reference: https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Azure CLI az ts reference: https://learn.microsoft.com/en-us/cli/azure/ts
- Deploy a template spec as a linked template: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-specs-deploy-linked-template
- Azure Pipelines AzureCLI task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2

## Issues Found
- The generated storage account name in the main template could exceed Azure Storage's 24-character maximum when `environment` was `staging`. Updated the expression to wrap the concatenated name in `substring(..., 0, 24)` so all allowed environments produce a valid storage account name.
- The hosting section said linked templates must be accessible via URL, but Azure template specs can be referenced by resource ID through `templateLink.id`. Updated the sentence to distinguish URL-hosted templates from template specs.
- The standalone Blob upload command used `--source ./linked`, which did not match the earlier recommended `infrastructure/linked` project structure unless run from inside the `infrastructure` directory. Updated it to `--source ./infrastructure/linked`.

## Review Notes
The ARM examples use valid linked-template syntax and valid linked deployment output references. The Azure CLI examples use current command groups and flags, but the local environment did not have the Azure CLI installed, so CLI verification was performed against Microsoft Learn documentation rather than local `az --help` output.
